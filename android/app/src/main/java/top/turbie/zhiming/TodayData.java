package top.turbie.zhiming;

import java.util.Calendar;
import java.util.TimeZone;

/**
 * Native port of assets/js/astro.js todayOverview() for the home-screen widget.
 * Kept free of Android imports so it can be exercised on a plain JVM.
 */
public final class TodayData {
    private static final String[] STEMS = {"甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"};
    private static final String[] BRANCHES = {"子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"};
    private static final String[] ANIMALS = {"鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"};
    private static final String[] LUNAR_MONTHS = {"正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "臘月"};
    private static final String[] LUNAR_DAYS = {
        "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
        "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
        "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
    };
    private static final String[] WEEKDAYS = {"週日", "週一", "週二", "週三", "週四", "週五", "週六"};
    private static final long DAY_MS = 86400000L;
    private static final TimeZone BEIJING = TimeZone.getTimeZone("GMT+08:00");

    public final String dayText;
    public final String yearText;
    public final String animal;
    public final String lunarYearText;
    public final String lunarText;
    public final String dateText;
    public final String weekdayText;

    private TodayData(String dayText, String yearText, String animal, String lunarYearText,
                      String lunarText, String dateText, String weekdayText) {
        this.dayText = dayText;
        this.yearText = yearText;
        this.animal = animal;
        this.lunarYearText = lunarYearText;
        this.lunarText = lunarText;
        this.dateText = dateText;
        this.weekdayText = weekdayText;
    }

    public static TodayData compute(long millis, String lichun, int lichunStartYear,
                                    int[] lunarInfo, int lunarStartYear) {
        Calendar now = Calendar.getInstance(BEIJING);
        now.setTimeInMillis(millis);
        int year = now.get(Calendar.YEAR);
        int month = now.get(Calendar.MONTH) + 1;
        int day = now.get(Calendar.DAY_OF_MONTH);
        int weekday = now.get(Calendar.DAY_OF_WEEK);

        Long lichunTs = lichunInstant(year, lichun, lichunStartYear);
        int yearForPillar = lichunTs != null && millis < lichunTs ? year - 1 : year;
        int yearIndex = mod(yearForPillar - 4, 60);
        long dayNumber = epochDay(year, month, day) + 25567 + 10;
        int dayIndex = (int) (((dayNumber % 60) + 60) % 60);

        int[] lunar = solarToLunar(year, month, day, lunarInfo, lunarStartYear);
        String lunarYearText = "";
        String lunarText = "";
        if (lunar != null) {
            int lunarIndex = mod(lunar[0] - 4, 60);
            lunarYearText = STEMS[lunarIndex % 10] + BRANCHES[lunarIndex % 12] + "年";
            lunarText = (lunar[3] == 1 ? "閏" : "") + LUNAR_MONTHS[lunar[1] - 1] + LUNAR_DAYS[lunar[2] - 1];
        }

        return new TodayData(
            STEMS[dayIndex % 10] + BRANCHES[dayIndex % 12] + "日",
            STEMS[yearIndex % 10] + BRANCHES[yearIndex % 12] + "年",
            ANIMALS[yearIndex % 12],
            lunarYearText,
            lunarText,
            month + "月" + day + "日",
            WEEKDAYS[weekday - 1]
        );
    }

    private static int mod(int value, int modulus) {
        return ((value % modulus) + modulus) % modulus;
    }

    private static long epochDay(int year, int month, int day) {
        Calendar utc = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        utc.clear();
        utc.set(year, month - 1, day);
        return Math.floorDiv(utc.getTimeInMillis(), DAY_MS);
    }

    private static Long lichunInstant(int year, String lichun, int startYear) {
        int base = (year - startYear) * 8;
        if (lichun == null || base < 0 || base + 8 > lichun.length()) return null;
        int month = Integer.parseInt(lichun.substring(base, base + 2));
        int day = Integer.parseInt(lichun.substring(base + 2, base + 4));
        int hour = Integer.parseInt(lichun.substring(base + 4, base + 6));
        int minute = Integer.parseInt(lichun.substring(base + 6, base + 8));
        Calendar cal = Calendar.getInstance(BEIJING);
        cal.clear();
        cal.set(year, month - 1, day, hour, minute);
        return cal.getTimeInMillis();
    }

    private static Integer info(int[] lunarInfo, int startYear, int year) {
        int index = year - startYear;
        if (index < 0 || index >= lunarInfo.length) return null;
        return lunarInfo[index];
    }

    private static int leapMonth(int[] lunarInfo, int startYear, int year) {
        Integer value = info(lunarInfo, startYear, year);
        return value == null ? 0 : value & 0xf;
    }

    private static int leapDays(int[] lunarInfo, int startYear, int year) {
        Integer value = info(lunarInfo, startYear, year);
        if (value == null || (value & 0xf) == 0) return 0;
        return (value & 0x10000) != 0 ? 30 : 29;
    }

    private static int monthDays(int[] lunarInfo, int startYear, int year, int month) {
        Integer value = info(lunarInfo, startYear, year);
        if (value == null) return 29;
        return (value & (0x10000 >> month)) != 0 ? 30 : 29;
    }

    private static int yearDays(int[] lunarInfo, int startYear, int year) {
        Integer value = info(lunarInfo, startYear, year);
        if (value == null) return 0;
        int sum = 348;
        for (int bit = 0x8000; bit > 0x8; bit >>= 1) {
            if ((value & bit) != 0) sum += 1;
        }
        return sum + leapDays(lunarInfo, startYear, year);
    }

    private static int[] solarToLunar(int year, int month, int day, int[] lunarInfo, int startYear) {
        if (info(lunarInfo, startYear, year) == null) return null;
        long offset = epochDay(year, month, day) - epochDay(1900, 1, 31);
        int lunarYear = 1900;
        while (info(lunarInfo, startYear, lunarYear) != null && offset >= yearDays(lunarInfo, startYear, lunarYear)) {
            offset -= yearDays(lunarInfo, startYear, lunarYear);
            lunarYear += 1;
        }
        if (info(lunarInfo, startYear, lunarYear) == null) return null;
        int leap = leapMonth(lunarInfo, startYear, lunarYear);
        int lunarMonth = 1;
        while (lunarMonth <= 12) {
            int days = monthDays(lunarInfo, startYear, lunarYear, lunarMonth);
            if (offset < days) {
                return new int[]{lunarYear, lunarMonth, (int) offset + 1, 0};
            }
            offset -= days;
            if (leap == lunarMonth) {
                int leapLength = leapDays(lunarInfo, startYear, lunarYear);
                if (offset < leapLength) {
                    return new int[]{lunarYear, lunarMonth, (int) offset + 1, 1};
                }
                offset -= leapLength;
            }
            lunarMonth += 1;
        }
        return null;
    }
}

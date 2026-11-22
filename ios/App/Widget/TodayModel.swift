import Foundation

struct TodaySnapshot {
    let dayText: String
    let yearText: String
    let animal: String
    let lunarYearText: String
    let lunarText: String
    let dateText: String
    let weekdayText: String
}

enum TodayModel {
    private static let stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
    private static let branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    private static let animals = ["鼠", "牛", "虎", "兔", "龍", "蛇", "馬", "羊", "猴", "雞", "狗", "豬"]
    private static let lunarMonths = ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "臘月"]
    private static let lunarDays = [
        "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
        "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
        "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
    ]
    private static let weekdays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"]

    private static let beijing = TimeZone(secondsFromGMT: 8 * 3600)!
    private static var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.timeZone = beijing
        return value
    }

    private struct SharedData: Decodable {
        let lichunStartYear: Int
        let lichun: String
        let lunarStartYear: Int
        let lunarInfo: [Int]
    }

    private static let shared: SharedData = {
        guard let url = Bundle.main.url(forResource: "TodayData", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let parsed = try? JSONDecoder().decode(SharedData.self, from: data) else {
            return SharedData(lichunStartYear: 1900, lichun: "", lunarStartYear: 1900, lunarInfo: [])
        }
        return parsed
    }()

    private static func positiveMod(_ value: Int, _ modulus: Int) -> Int {
        ((value % modulus) + modulus) % modulus
    }

    private static func epochDay(_ year: Int, _ month: Int, _ day: Int) -> Int {
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(secondsFromGMT: 0)!
        let date = utc.date(from: DateComponents(year: year, month: month, day: day)) ?? Date(timeIntervalSince1970: 0)
        return Int(floor(date.timeIntervalSince1970 / 86400))
    }

    static func lichunInstant(year: Int) -> Date? {
        let chars = Array(shared.lichun)
        let base = (year - shared.lichunStartYear) * 8
        guard base >= 0, base + 8 <= chars.count else { return nil }
        func number(_ offset: Int) -> Int {
            Int(String(chars[(base + offset)..<(base + offset + 2)])) ?? 0
        }
        return calendar.date(from: DateComponents(
            year: year, month: number(0), day: number(2), hour: number(4), minute: number(6)
        ))
    }

    // Mirrors assets/js/astro.js: LUNAR_INFO is one bit-packed value per lunar year.
    private static func lunarInfo(_ year: Int) -> Int? {
        let index = year - shared.lunarStartYear
        guard shared.lunarInfo.indices.contains(index) else { return nil }
        return shared.lunarInfo[index]
    }

    private static func leapMonth(_ year: Int) -> Int { (lunarInfo(year) ?? 0) & 0xf }

    private static func leapDays(_ year: Int) -> Int {
        guard leapMonth(year) != 0 else { return 0 }
        return (lunarInfo(year) ?? 0) & 0x10000 != 0 ? 30 : 29
    }

    private static func lunarMonthDays(_ year: Int, _ month: Int) -> Int {
        (lunarInfo(year) ?? 0) & (0x10000 >> month) != 0 ? 30 : 29
    }

    private static func lunarYearDays(_ year: Int) -> Int {
        let info = lunarInfo(year) ?? 0
        var sum = 348
        var bit = 0x8000
        while bit > 0x8 {
            if info & bit != 0 { sum += 1 }
            bit >>= 1
        }
        return sum + leapDays(year)
    }

    private static func solarToLunar(year: Int, month: Int, day: Int) -> (year: Int, month: Int, day: Int, isLeap: Bool)? {
        guard lunarInfo(year) != nil else { return nil }
        var offset = epochDay(year, month, day) - epochDay(1900, 1, 31)
        var lunarYear = 1900
        while lunarInfo(lunarYear) != nil, offset >= lunarYearDays(lunarYear) {
            offset -= lunarYearDays(lunarYear)
            lunarYear += 1
        }
        guard lunarInfo(lunarYear) != nil else { return nil }
        let leap = leapMonth(lunarYear)
        var lunarMonth = 1
        while lunarMonth <= 12 {
            let days = lunarMonthDays(lunarYear, lunarMonth)
            if offset < days {
                return (lunarYear, lunarMonth, offset + 1, false)
            }
            offset -= days
            if leap == lunarMonth {
                let leapLength = leapDays(lunarYear)
                if offset < leapLength {
                    return (lunarYear, lunarMonth, offset + 1, true)
                }
                offset -= leapLength
            }
            lunarMonth += 1
        }
        return nil
    }

    static func snapshot(at date: Date = Date()) -> TodaySnapshot {
        let components = calendar.dateComponents([.year, .month, .day, .weekday], from: date)
        let year = components.year ?? 2000
        let month = components.month ?? 1
        let day = components.day ?? 1
        let weekday = components.weekday ?? 1

        let yearForPillar: Int
        if let lichun = lichunInstant(year: year), date < lichun {
            yearForPillar = year - 1
        } else {
            yearForPillar = year
        }
        let yearIndex = positiveMod(yearForPillar - 4, 60)
        let dayIndex = positiveMod(epochDay(year, month, day) + 25567 + 10, 60)

        let lunar = solarToLunar(year: year, month: month, day: day)
        let lunarYearIndex = lunar.map { positiveMod($0.year - 4, 60) }
        let lunarYearText = lunarYearIndex.map { "\(stems[$0 % 10])\(branches[$0 % 12])年" } ?? ""
        let lunarText = lunar.map { value in
            let prefix = value.isLeap ? "閏" : ""
            let monthName = lunarMonths.indices.contains(value.month - 1) ? lunarMonths[value.month - 1] : "\(value.month)月"
            let dayName = lunarDays.indices.contains(value.day - 1) ? lunarDays[value.day - 1] : "\(value.day)"
            return "\(prefix)\(monthName)\(dayName)"
        } ?? ""

        let formatter = DateFormatter()
        formatter.timeZone = beijing
        formatter.dateFormat = "M月d日"

        return TodaySnapshot(
            dayText: "\(stems[dayIndex % 10])\(branches[dayIndex % 12])日",
            yearText: "\(stems[yearIndex % 10])\(branches[yearIndex % 12])年",
            animal: animals[yearIndex % 12],
            lunarYearText: lunarYearText,
            lunarText: lunarText,
            dateText: formatter.string(from: date),
            weekdayText: weekdays.indices.contains(weekday - 1) ? weekdays[weekday - 1] : ""
        )
    }

    static func nextRefresh(after date: Date) -> Date {
        let startOfDay = calendar.startOfDay(for: date)
        var nextMidnight = calendar.date(byAdding: .day, value: 1, to: startOfDay) ?? date.addingTimeInterval(3600)
        nextMidnight = nextMidnight.addingTimeInterval(60)
        let beijingYear = calendar.component(.year, from: date)
        var candidates = [nextMidnight]
        for year in [beijingYear, beijingYear + 1] {
            if let lichun = lichunInstant(year: year), lichun > date {
                candidates.append(lichun.addingTimeInterval(60))
            }
        }
        return candidates.min() ?? nextMidnight
    }
}

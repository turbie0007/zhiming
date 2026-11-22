package top.turbie.zhiming;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

final class WidgetData {
    private WidgetData() {}

    static TodayData today(Context context) {
        long now = System.currentTimeMillis();
        try (InputStream input = context.getAssets().open("today_data.json")) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = input.read(chunk)) != -1) buffer.write(chunk, 0, read);
            JSONObject root = new JSONObject(buffer.toString(StandardCharsets.UTF_8.name()));
            JSONArray lunar = root.getJSONArray("lunarInfo");
            int[] lunarInfo = new int[lunar.length()];
            for (int i = 0; i < lunar.length(); i += 1) lunarInfo[i] = lunar.getInt(i);
            return TodayData.compute(now, root.getString("lichun"), root.getInt("lichunStartYear"),
                lunarInfo, root.getInt("lunarStartYear"));
        } catch (Exception error) {
            return TodayData.compute(now, null, 1900, new int[0], 1900);
        }
    }
}

import SwiftUI
import WidgetKit

private extension Color {
    static func adaptive(light: (CGFloat, CGFloat, CGFloat), dark: (CGFloat, CGFloat, CGFloat)) -> Color {
        #if canImport(UIKit)
        return Color(UIColor { trait in
            trait.userInterfaceStyle == .dark
                ? UIColor(red: dark.0, green: dark.1, blue: dark.2, alpha: 1)
                : UIColor(red: light.0, green: light.1, blue: light.2, alpha: 1)
        })
        #else
        return Color(red: light.0, green: light.1, blue: light.2)
        #endif
    }
    static let paper = adaptive(light: (0.953, 0.929, 0.875), dark: (0.078, 0.071, 0.055))
    static let ink = adaptive(light: (0.122, 0.110, 0.090), dark: (0.929, 0.894, 0.824))
    static let inkSoft = adaptive(light: (0.306, 0.278, 0.235), dark: (0.769, 0.722, 0.639))
    static let cinnabar = adaptive(light: (0.651, 0.212, 0.169), dark: (0.824, 0.357, 0.286))
}

struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: TodaySnapshot
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: Date(), snapshot: TodayModel.snapshot())
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(TodayEntry(date: Date(), snapshot: TodayModel.snapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let now = Date()
        let entry = TodayEntry(date: now, snapshot: TodayModel.snapshot(at: now))
        completion(Timeline(entries: [entry], policy: .after(TodayModel.nextRefresh(after: now))))
    }
}

struct TodayWidgetView: View {
    let snapshot: TodaySnapshot
    var familyOverride: WidgetFamily?

    @Environment(\.widgetFamily) private var environmentFamily

    private var family: WidgetFamily {
        familyOverride ?? environmentFamily
    }

    var body: some View {
        Group {
            if family == .systemMedium { medium } else { compact }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .widgetBackground()
        .widgetURL(URL(string: "top.turbie.zhiming://"))
    }

    private var brand: some View {
        Text("知命 · 今日")
            .font(.system(size: 11, weight: .semibold))
            .tracking(2)
            .foregroundColor(.cinnabar)
    }

    private var compact: some View {
        VStack(alignment: .leading, spacing: 0) {
            brand
            Spacer(minLength: 6)
            Text(snapshot.dayText)
                .font(.system(size: 30, weight: .semibold, design: .serif))
                .foregroundColor(.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text("\(snapshot.yearText) · \(snapshot.animal)")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.inkSoft)
                .padding(.top, 2)
            Spacer(minLength: 6)
            Text("\(snapshot.dateText) \(snapshot.weekdayText)")
                .font(.system(size: 12))
                .foregroundColor(.inkSoft)
            Text("\(snapshot.lunarYearText) \(snapshot.lunarText)")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }

    private var medium: some View {
        VStack(alignment: .leading, spacing: 0) {
            brand
            Spacer(minLength: 8)
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(snapshot.dayText)
                        .font(.system(size: 38, weight: .semibold, design: .serif))
                        .foregroundColor(.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                    Text("\(snapshot.yearText) · \(snapshot.animal)")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.inkSoft)
                }
                Spacer(minLength: 12)
                VStack(alignment: .trailing, spacing: 4) {
                    Text(snapshot.lunarText)
                        .font(.system(size: 17, weight: .medium, design: .serif))
                        .foregroundColor(.ink)
                    Text(snapshot.lunarYearText)
                        .font(.system(size: 11))
                        .foregroundColor(.inkSoft)
                    Text("\(snapshot.dateText) \(snapshot.weekdayText)")
                        .font(.system(size: 11))
                        .foregroundColor(.inkSoft)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

private struct WidgetBackgroundModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) { Color.paper }
        } else {
            content.padding(14).background(Color.paper)
        }
    }
}

private extension View {
    func widgetBackground() -> some View {
        modifier(WidgetBackgroundModifier())
    }
}

@main
struct ZhimingWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "ZhimingTodayWidget", provider: TodayProvider()) { entry in
            TodayWidgetView(snapshot: entry.snapshot)
        }
        .configurationDisplayName("今日干支")
        .description("在桌面看今日干支、農曆與生肖。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

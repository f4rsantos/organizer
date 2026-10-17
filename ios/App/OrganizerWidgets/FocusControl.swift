import AppIntents
import SwiftUI
import WidgetKit

@available(iOS 18.0, *)
struct FocusControl: ControlWidget {
    static let kind = "io.github.f4rsantos.organizer.FocusControl"

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind, provider: FocusControlValueProvider()) { running in
            ControlWidgetToggle("control.focus.name", isOn: running, action: FocusControlIntent()) { isOn in
                Label(LocalizedStringKey(isOn ? "control.focus.on" : "control.focus.off"), systemImage: isOn ? "pause.fill" : "timer")
            }
            .tint(Color(light: 0xE5484D, dark: 0xF2555A))
        }
        .displayName("control.focus.name")
        .description("control.focus.description")
    }
}

@available(iOS 18.0, *)
struct FocusControlValueProvider: ControlValueProvider {
    var previewValue: Bool { false }

    func currentValue() async throws -> Bool {
        WidgetShared.focusRunning()
    }
}

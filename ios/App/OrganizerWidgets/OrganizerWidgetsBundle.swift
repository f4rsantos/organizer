import SwiftUI
import WidgetKit

@main
struct OrganizerWidgetsBundle: WidgetBundle {
    var body: some Widget {
        SummaryWidget()
        TasksWidget()
        CalendarWidget()
        AgendaWidget()
        KanbanWidget()
        HabitsWidget()
        PomodoroWidget()
        OrganizerLiveActivity()
        if #available(iOS 18.0, *) {
            FocusControl()
        }
    }
}

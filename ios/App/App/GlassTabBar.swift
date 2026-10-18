import SwiftUI
import UIKit

enum GlassTabBarPlacement: String, Decodable {
    case top
    case bottom
}

struct GlassAddAction: Decodable, Identifiable {
    let id: String
    let label: String
}

struct GlassTabItem: Decodable, Identifiable {
    let id: String
    let label: String
    let symbol: String
    let kind: String
    let children: [GlassTabItem]
    let actions: [GlassAddAction]
}

struct GlassTabBarSpec: Decodable {
    let visible: Bool
    let placement: GlassTabBarPlacement
    let selected: String
    let labelMode: String
    let theme: String
    let tint: String?
    let items: [GlassTabItem]
}

final class GlassTabBarModel: ObservableObject {
    @Published var spec: GlassTabBarSpec?
}

struct GlassTabBar: View {
    @ObservedObject var model: GlassTabBarModel
    let onSelect: (String, String?) -> Void

    var body: some View {
        if let spec = model.spec {
            GlassTabRow(spec: spec, onSelect: onSelect)
        }
    }
}

private struct GlassTabRow: View {
    let spec: GlassTabBarSpec
    let onSelect: (String, String?) -> Void

    private var tint: Color {
        guard let hex = spec.tint, let color = UIColor(organizerHex: hex) else { return .accentColor }
        return Color(color)
    }

    private var fillsWidth: Bool {
        spec.placement == .bottom
    }

    var body: some View {
        HStack(spacing: 2) {
            ForEach(spec.items) { item in
                GlassTabButton(
                    item: item,
                    selected: spec.selected,
                    labelMode: spec.labelMode,
                    tint: tint,
                    fillsWidth: fillsWidth,
                    onSelect: onSelect
                )
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 4)
        .modifier(GlassCapsuleBackground())
    }
}

private struct GlassTabButton: View {
    let item: GlassTabItem
    let selected: String
    let labelMode: String
    let tint: Color
    let fillsWidth: Bool
    let onSelect: (String, String?) -> Void

    private var isSelected: Bool {
        item.id == selected || item.children.contains { $0.id == selected }
    }

    private var label: some View {
        GlassTabLabel(item: item, labelMode: labelMode, isSelected: isSelected, tint: tint, fillsWidth: fillsWidth)
    }

    private var labelTint: Color {
        isSelected || item.kind == "add" ? tint : .secondary
    }

    var body: some View {
        switch item.kind {
        case "folder":
            Menu {
                ForEach(item.children) { child in
                    Button {
                        onSelect(child.id, nil)
                    } label: {
                        Label(child.label, systemImage: child.symbol)
                    }
                }
            } label: {
                label
            }
            .menuIndicator(.hidden)
            .tint(labelTint)
        case "add" where !item.actions.isEmpty:
            Menu {
                ForEach(item.actions) { action in
                    Button(action.label) {
                        onSelect(item.id, action.id)
                    }
                }
            } label: {
                label
            }
            .menuIndicator(.hidden)
            .tint(labelTint)
        default:
            Button {
                onSelect(item.id, nil)
            } label: {
                label
            }
            .buttonStyle(.plain)
        }
    }
}

private struct GlassTabLabel: View {
    let item: GlassTabItem
    let labelMode: String
    let isSelected: Bool
    let tint: Color
    let fillsWidth: Bool

    private var showsIcon: Bool { labelMode != "names" }
    private var showsText: Bool { labelMode != "icons" }
    private var isAdd: Bool { item.kind == "add" }

    var body: some View {
        VStack(spacing: 2) {
            if showsIcon {
                Image(systemName: item.symbol)
                    .font(.system(size: 18, weight: isSelected ? .semibold : .regular))
                    .frame(height: 22)
            }
            if showsText {
                Text(item.label)
                    .font(.caption2.weight(.medium))
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .frame(maxWidth: fillsWidth ? .infinity : nil)
        .foregroundColor(isSelected || isAdd ? tint : .secondary)
        .background(
            Capsule().fill(isSelected ? tint.opacity(0.18) : Color.clear)
        )
        .contentShape(Capsule())
        .accessibilityLabel(item.label)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

private struct GlassCapsuleBackground: ViewModifier {
    @ViewBuilder
    func body(content: Content) -> some View {
#if compiler(>=6.2)
        if #available(iOS 26.0, *) {
            content.glassEffect(.regular.interactive(), in: Capsule())
        } else {
            content.background(.ultraThinMaterial, in: Capsule())
        }
#else
        content.background(.ultraThinMaterial, in: Capsule())
#endif
    }
}

extension UIColor {
    convenience init?(organizerHex hex: String) {
        let digits = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard digits.count == 6, let value = UInt32(digits, radix: 16) else { return nil }
        self.init(
            red: CGFloat((value >> 16) & 0xFF) / 255,
            green: CGFloat((value >> 8) & 0xFF) / 255,
            blue: CGFloat(value & 0xFF) / 255,
            alpha: 1
        )
    }
}

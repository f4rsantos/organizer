import UIKit
import Capacitor

class OrganizerViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(OrganizerChromePlugin())
        bridge?.registerPluginInstance(OrganizerWidgetsPlugin())
    }
}

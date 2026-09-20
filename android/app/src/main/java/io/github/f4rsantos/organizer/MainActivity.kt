package io.github.f4rsantos.organizer

import android.content.Intent
import android.os.Bundle

import com.getcapacitor.BridgeActivity

import io.github.f4rsantos.organizer.widgets.OrganizerWidgetsPlugin
import io.github.f4rsantos.organizer.focus.FocusOverlayPlugin

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(OrganizerWidgetsPlugin::class.java)
        registerPlugin(FocusOverlayPlugin::class.java)
        super.onCreate(savedInstanceState)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
    }
}

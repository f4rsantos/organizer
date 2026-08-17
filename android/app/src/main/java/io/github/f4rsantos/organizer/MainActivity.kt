package io.github.f4rsantos.organizer

import android.os.Bundle

import com.getcapacitor.BridgeActivity

import io.github.f4rsantos.organizer.widgets.OrganizerWidgetsPlugin

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(OrganizerWidgetsPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}

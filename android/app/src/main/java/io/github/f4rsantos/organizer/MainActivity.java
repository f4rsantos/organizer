package io.github.f4rsantos.organizer;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import io.github.f4rsantos.organizer.widgets.OrganizerWidgetsPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OrganizerWidgetsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

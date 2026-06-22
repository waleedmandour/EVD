package com.waleedmandour.evdx;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.waleedmandour.evdx.byd.BYDAutoPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register BYD Auto plugin before super.onCreate
        registerPlugin(BYDAutoPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

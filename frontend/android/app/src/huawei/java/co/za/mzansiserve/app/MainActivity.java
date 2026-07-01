package co.za.mzansiserve.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(HuaweiGeolocationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

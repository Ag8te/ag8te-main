package co.za.ag8te.app;

import android.Manifest;
import android.location.Location;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.huawei.hms.location.FusedLocationProviderClient;
import com.huawei.hms.location.LocationCallback;
import com.huawei.hms.location.LocationRequest;
import com.huawei.hms.location.LocationResult;
import com.huawei.hms.location.LocationServices;

@CapacitorPlugin(
    name = "Geolocation",
    permissions = {
        @Permission(
            strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION },
            alias = HuaweiGeolocationPlugin.LOCATION_ALIAS
        ),
        @Permission(strings = { Manifest.permission.ACCESS_COARSE_LOCATION }, alias = HuaweiGeolocationPlugin.COARSE_LOCATION_ALIAS)
    }
)
public class HuaweiGeolocationPlugin extends Plugin {
    static final String LOCATION_ALIAS = "location";
    static final String COARSE_LOCATION_ALIAS = "coarseLocation";

    private FusedLocationProviderClient locationClient;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        locationClient = LocationServices.getFusedLocationProviderClient(getActivity());
    }

    @PluginMethod
    public void getCurrentPosition(PluginCall call) {
        String alias = permissionAlias(call);
        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "completeCurrentPosition");
            return;
        }
        requestPosition(call);
    }

    @PermissionCallback
    private void completeCurrentPosition(PluginCall call) {
        if (getPermissionState(COARSE_LOCATION_ALIAS) != PermissionState.GRANTED) {
            call.reject("Location permission was denied.", "OS-PLUG-GLOC-0003");
            return;
        }
        requestPosition(call);
    }

    private String permissionAlias(PluginCall call) {
        boolean highAccuracy = Boolean.TRUE.equals(call.getBoolean("enableHighAccuracy", false));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !highAccuracy) {
            return COARSE_LOCATION_ALIAS;
        }
        return LOCATION_ALIAS;
    }

    private void requestPosition(PluginCall call) {
        long timeout = Math.max(1L, numberOption(call, "timeout", 10000L));
        long maximumAge = Math.max(0L, numberOption(call, "maximumAge", 0L));

        if (maximumAge > 0) {
            locationClient.getLastLocation()
                .addOnSuccessListener(location -> {
                    if (location != null && System.currentTimeMillis() - location.getTime() <= maximumAge) {
                        call.resolve(toPosition(location));
                    } else {
                        requestFreshPosition(call, timeout);
                    }
                })
                .addOnFailureListener(error -> requestFreshPosition(call, timeout));
            return;
        }

        requestFreshPosition(call, timeout);
    }

    private void requestFreshPosition(PluginCall call, long timeout) {
        boolean highAccuracy = Boolean.TRUE.equals(call.getBoolean("enableHighAccuracy", false));
        LocationRequest request = new LocationRequest()
            .setPriority(highAccuracy ? LocationRequest.PRIORITY_HIGH_ACCURACY : LocationRequest.PRIORITY_BALANCED_POWER_ACCURACY)
            .setInterval(timeout)
            .setFastestInterval(Math.min(timeout, 5000L))
            .setNumUpdates(1);

        final boolean[] finished = { false };
        final LocationCallback[] callbackHolder = new LocationCallback[1];
        Runnable timeoutAction = () -> {
            if (finished[0]) return;
            finished[0] = true;
            locationClient.removeLocationUpdates(callbackHolder[0]);
            call.reject("Location request timed out.", "OS-PLUG-GLOC-0010");
        };

        callbackHolder[0] = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (finished[0]) return;
                Location location = result == null ? null : result.getLastLocation();
                if (location == null) return;
                finished[0] = true;
                handler.removeCallbacks(timeoutAction);
                locationClient.removeLocationUpdates(this);
                call.resolve(toPosition(location));
            }
        };

        handler.postDelayed(timeoutAction, timeout);
        locationClient.requestLocationUpdates(request, callbackHolder[0], Looper.getMainLooper())
            .addOnFailureListener(error -> {
                if (finished[0]) return;
                finished[0] = true;
                handler.removeCallbacks(timeoutAction);
                call.reject("Huawei Location Kit could not obtain the device position.", "OS-PLUG-GLOC-0002", error);
            });
    }

    private JSObject toPosition(Location location) {
        JSObject coords = new JSObject();
        coords.put("latitude", location.getLatitude());
        coords.put("longitude", location.getLongitude());
        coords.put("accuracy", location.getAccuracy());
        coords.put("altitude", location.hasAltitude() ? location.getAltitude() : null);
        coords.put("altitudeAccuracy", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && location.hasVerticalAccuracy()
            ? location.getVerticalAccuracyMeters()
            : null);
        coords.put("speed", location.hasSpeed() ? location.getSpeed() : null);
        coords.put("heading", location.hasBearing() ? location.getBearing() : null);

        JSObject position = new JSObject();
        position.put("timestamp", location.getTime());
        position.put("coords", coords);
        return position;
    }

    private long numberOption(PluginCall call, String name, long defaultValue) {
        Long longValue = call.getLong(name);
        if (longValue != null) return longValue;
        Integer intValue = call.getInt(name);
        return intValue == null ? defaultValue : intValue.longValue();
    }
}

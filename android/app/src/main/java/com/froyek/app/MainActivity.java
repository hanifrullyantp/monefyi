package com.froyek.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public static final String HIGH_PRIORITY_CHANNEL_ID = "froyek_high_priority";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createHighPriorityNotificationChannel();
    }

    private void createHighPriorityNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                HIGH_PRIORITY_CHANNEL_ID,
                "Notifikasi Penting Froyek",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifikasi real-time order, approval, dan peringatan sistem Froyek.");
            channel.enableVibration(true);
            channel.enableLights(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}

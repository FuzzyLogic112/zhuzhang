package io.github.fuzzylogic112.zhuzhang;

import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;
import java.time.*;

public final class ReminderReceiver extends BroadcastReceiver {
    static final String CHANNEL = "project-reminders";
    static final int NOTICE = 200, ALARM = 201;
    static android.content.SharedPreferences prefs(Context c) { return c.getSharedPreferences("local-reminders", Context.MODE_PRIVATE); }
    static void channel(Context c) { c.getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel(CHANNEL,"工程到期与缺票",NotificationManager.IMPORTANCE_DEFAULT)); }
    static boolean allowed(Context c) { channel(c); NotificationManager nm=c.getSystemService(NotificationManager.class); return nm.areNotificationsEnabled() && nm.getNotificationChannel(CHANNEL).getImportance()!=NotificationManager.IMPORTANCE_NONE; }
    static PendingIntent pending(Context c) { return PendingIntent.getBroadcast(c,ALARM,new Intent(c,ReminderReceiver.class).setAction("io.github.fuzzylogic112.zhuzhang.REMIND"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE); }
    static void schedule(Context c) {
        AlarmManager alarm=c.getSystemService(AlarmManager.class);alarm.cancel(pending(c));
        if(!prefs(c).getBoolean("enabled",false)) return;
        ZonedDateTime now=ZonedDateTime.now(ZoneId.of("Asia/Shanghai")),next=now.withHour(9).withMinute(0).withSecond(0).withNano(0);
        if(!next.isAfter(now))next=next.plusDays(1);
        alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next.toInstant().toEpochMilli(),pending(c));
    }
    static void sync(Context c,String json) throws JSONException {
        JSONArray a=new JSONArray(json); if(a.length()>10000||json.length()>2000000)throw new JSONException("too many reminders");
        for(int i=0;i<a.length();i++){JSONObject x=a.getJSONObject(i);LocalDate.parse(x.getString("start"));if(x.getString("title").length()>300||x.getString("body").length()>500)throw new JSONException("text too long");}
        prefs(c).edit().putString("items",json).apply();c.getSystemService(NotificationManager.class).cancel(NOTICE);schedule(c);
    }
    static void show(Context c,boolean test) {
        if(!allowed(c))return;
        if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
        String today=LocalDate.now(ZoneId.of("Asia/Shanghai")).toString();
        if(!test&&today.equals(prefs(c).getString("sent-day","")))return;
        int count=0;StringBuilder body=new StringBuilder();
        try{JSONArray a=new JSONArray(prefs(c).getString("items","[]"));for(int i=0;i<a.length();i++){JSONObject x=a.getJSONObject(i);if(x.getString("start").compareTo(today)>0)continue;count++;if(count<=5)body.append(x.getString("title")).append("：").append(x.getString("body")).append("\n");}}catch(JSONException ignored){}
        if(!test&&count==0)return;
        Intent open=new Intent(c,MainActivity.class).putExtra("openReminders",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap=PendingIntent.getActivity(c,202,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String content=test?"本机通知测试成功；每日北京时间 9 点后检查工程事项，系统省电可能延迟。":body.toString();
        Notification notice=new Notification.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(test?"筑账 · 通知测试":"筑账 · "+count+" 项待办需关注").setContentText(test?"点击返回筑账":count+" 项到期、催收或缺票事项").setStyle(new Notification.BigTextStyle().bigText(content)).setContentIntent(tap).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build();
        c.getSystemService(NotificationManager.class).notify(test?203:NOTICE,notice);
        if(!test)prefs(c).edit().putString("sent-day",today).apply();
    }
    @Override public void onReceive(Context context,Intent intent) {
        if(!prefs(context).getBoolean("enabled",false))return;
        if("io.github.fuzzylogic112.zhuzhang.REMIND".equals(intent.getAction()))show(context,false);
        schedule(context);
    }
}

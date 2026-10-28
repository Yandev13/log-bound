# How to run OJT-DTR: guide for non-technical users

This guide tells you how to open and use the OJT-DTR system on an Android phone and in a web browser. You do not need technical knowledge.

NOTE: This guide is for the current test version (stage S2, 2026-10-26). The system is not finished. Some parts are not available yet (see section 5). The final user manuals come in stage S5.

## 1. What you need

| Item | Details |
|---|---|
| Account | An email address and a password. The developer gives them to you. You cannot make your own account. |
| For the mobile app | An Android phone with Android 11 or later, and the app file `app-debug.apk` (about 22 MB) from the developer. |
| For the web app | The developer's PC, with the web app started (section 4). |
| Internet | Necessary for the first login only. After that, the mobile app operates without internet. |

The accounts have three roles:

| Role | Where to use it |
|---|---|
| OJT (student) | Mobile app only |
| Facilitator | Mobile app only |
| Admin | Web app only |

If you log in with the wrong app for your role, the app shows a message and does not let you in.

## 2. Install the mobile app (Android)

1. Get the file `app-debug.apk` from the developer (for example, through Google Drive or a USB cable).
2. On the phone, open the file (usually in the **Downloads** folder or the **Files** app).
3. If the phone shows "For your security, your phone is not allowed to install unknown apps", tap **Settings**, turn on **Allow from this source**, then go back.
4. Tap **Install**. Wait until you see "App installed".
5. Tap **Open**. The app name is **OJT-DTR**.

If Google Play Protect shows a warning, tap **More details**, then **Install anyway**. The warning shows because the test app does not come from the Play Store.

To install a newer version, do the same steps. Your data stays on the phone.

## 3. Use the mobile app

### 3.1 Log in

1. Make sure that the phone has internet.
2. Type your email address and your password.
3. Tap **Log in**.

After the first login, the app opens also with no internet.

### 3.2 OJT: record your time

1. Tap the **DTR** tab at the bottom.
2. Tap **Time in** when you start work.
3. Tap **Time out** when you stop work.

- If the phone asks for the location permission, tap **Allow**. The app records where you were. If you do not allow it, the app still records the time.
- If your company requires a photo, the camera opens. Take a selfie and confirm it. If you close the camera, the time is not recorded.
- The list below the button shows your work sessions and hours.

### 3.3 Work with no internet

You can record your time with no internet. The app keeps the records on the phone and sends them when the internet comes back.

The bar at the top shows the sync status:

| Message | Meaning |
|---|---|
| All changes synced | The server has all your records. |
| 2 unsynced changes | Records wait on the phone. They go to the server when the internet comes back. In the list, these records show **Pending sync**. |
| No network | The phone has no internet. Continue to work normally. |
| Server not reachable | The server does not answer. The app tries again automatically. |
| 1 sync issue | The server did not accept a change. Tap the message to open **Sync issues** and see the cause. Then tap **Try again** or **Discard my change**. |

To send and get records immediately, pull the page down (pull-to-refresh).

### 3.4 Facilitator: see your OJTs

1. Log in with a facilitator account.
2. The **My OJTs** list shows your students.
3. Tap a name to see the time records of that student.
4. A record with the label **Doubtful time** was made when the phone clock was not correct. Check it with the student.

### 3.5 Log out

1. Tap the **Log out** button at the top right.
2. If records are not sent yet, the app shows a CAUTION with the number of records. If you tap **Log out and lose the changes**, these records are lost. If possible, tap **Cancel**, connect to the internet, wait for "All changes synced", then log out.

## 4. Use the web app (admin)

At this time, the web app runs only on the developer's PC. It is not on the internet yet (that comes in stage S5).

1. Ask the developer to start the web app on the PC.
2. On that PC, open Chrome, Edge, or Firefox.
3. Go to `http://localhost:8100`.
4. Log in with an admin account.

## 5. What is not available yet

| Function | Stage |
|---|---|
| Weekly reports (write, submit, approve, return) | S3 |
| Correction requests for wrong times | S3 |
| Admin pages: users, companies, batches, assignments, CSV export | S3 |
| Notifications and the full profile page | S4 |
| Web app on the internet, Play Store or final release app | S5 |

## 6. Problems and solutions

| Problem | Solution |
|---|---|
| "The email or the password is not correct" | Check the email address and the password. Ask the developer to reset the password. |
| "Too many login attempts" | Wait 5 minutes, then try again. |
| "This account cannot use this app" | Your role uses the other app (section 1). |
| "This account is not active" | Ask the admin or the developer. |
| The app does not install | Make sure that the phone has Android 11 or later and that "Allow from this source" is on (section 2, step 3). |
| Records stay "pending" for a long time | Check the internet. Then pull the page down. |
| The app shows the login screen again | Your session ended (for example, after a long time with no internet). Log in again. Records that were not sent are kept. |
| Something else | Take a screenshot and send it to the developer with the time and what you did. |

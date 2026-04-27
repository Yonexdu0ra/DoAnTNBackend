import admin from "./src/configs/firebaseAdmin.js";

admin.messaging().send({
    token: "dVYcoe9kT0CNzSxXvVjlLF:APA91bE84Y_0qO9cNyQUXSwHWZWsnxDyi2bdMf83fiY7DXLPM_9sgDdN4Dd5qrfDnKykyTf6l1ASfvCD77b92ccjO6QRx7U_0juw02VimoIv_qOVB7zJy60",
    notification: {
        title: "Hello",
        body: "This is a test notification from Firebase Admin SDK"
    }
})
.then((response) => {
    console.log("Successfully sent message:", response);
})
.catch((error) => {
    console.error("Error sending message:", error);
});
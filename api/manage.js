// api/manage.js — Chatrix Serverless Admin Controller (App Check Safe)

const FIREBASE_DB_URL = "https://chatrix-5d023-default-rtdb.firebaseio.com";
const APP_ID = "chatrix-app";
const OFFICIAL_SYSTEM_UID = "chatrix_official";

// MASTER ADMIN CREDENTIALS
const ADMIN_USER = "admin";
const ADMIN_PASS = "Chatrix@Admin#2026";
const ADMIN_SECRET_TOKEN = "CTX_ADMIN_SECRET_KEY_98372641098412_SECURE";

// Optional Database Secret (Vercel Environment Variable ya direct string)
// Firebase Console -> Project Settings -> Service Accounts -> Database Secrets
const DB_SECRET = process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_DB_SECRET || "";

// E2E Encryption / Decryption Helper (Server-side)
function decryptData(encodedText) {
    if (!encodedText) return encodedText;
    const str = String(encodedText);
    if (str.startsWith("CTX:")) {
        try { return decodeURIComponent(Buffer.from(str.substring(4), 'base64').toString('utf-8')); } catch(e) { return str; }
    }
    try { return decodeURIComponent(Buffer.from(str, 'base64').toString('utf-8')); } catch(e) { return str; }
}

function encryptData(text) {
    if (!text) return text;
    try { return "CTX:" + Buffer.from(encodeURIComponent(String(text))).toString('base64'); } catch(e) { return String(text); }
}

// Firebase RTDB REST Helper (App Check Bypass via Auth Secret)
async function firebaseFetch(path, method = 'GET', body = null) {
    const authQuery = DB_SECRET ? `?auth=${DB_SECRET}` : "";
    const url = `${FIREBASE_DB_URL}/artifacts/${APP_ID}/${path}.json${authQuery}`;
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    return await res.json();
}

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { action, ...payload } = req.body || {};

        // 1. PUBLIC ACTION: ADMIN LOGIN
        if (action === 'login') {
            const { username, password } = payload;
            if ((username === ADMIN_USER || username === 'chatrix_admin') && password === ADMIN_PASS) {
                return res.status(200).json({
                    success: true,
                    token: ADMIN_SECRET_TOKEN,
                    message: 'Admin Authentication Succeeded'
                });
            } else {
                return res.status(401).json({ error: 'Invalid admin username or password' });
            }
        }

        // 2. TOKEN SECURITY GATE: ALL OTHER ACTIONS REQUIRE TOKEN
        const token = req.headers['x-admin-token'] || req.headers['authorization'];
        if (token !== ADMIN_SECRET_TOKEN && token !== `Bearer ${ADMIN_SECRET_TOKEN}`) {
            return res.status(403).json({ error: 'Unauthorized: Access Restricted' });
        }

        // 3. SECURE DISPATCHER
        switch (action) {
            // GET FULL SYSTEM DATA
            case 'get-all-data': {
                const [users, appeals, settings, requests] = await Promise.all([
                    firebaseFetch('users'),
                    firebaseFetch('appeals'),
                    firebaseFetch('settings'),
                    firebaseFetch('premium_requests')
                ]);

                // Decrypt user passwords securely on server for display
                const safeUsers = users || {};
                Object.keys(safeUsers).forEach(uid => {
                    if (safeUsers[uid] && safeUsers[uid].password) {
                        safeUsers[uid].decryptedPassword = decryptData(safeUsers[uid].password);
                    }
                });

                return res.status(200).json({
                    success: true,
                    users: safeUsers,
                    appeals: appeals || {},
                    settings: settings || {},
                    premiumRequests: requests || {}
                });
            }

            // BAN USER
            case 'ban-user': {
                const { uid, reason, isTemp } = payload;
                if (!uid) return res.status(400).json({ error: 'UID required' });
                
                const updates = {
                    isBanned: true,
                    banReason: reason || "Account restricted by administrator.",
                    banExpiresAt: isTemp ? (Date.now() + 2 * 60 * 60 * 1000) : null
                };
                await firebaseFetch(`users/${uid}`, 'PATCH', updates);
                return res.status(200).json({ success: true, message: 'User banned' });
            }

            // UNBAN USER
            case 'unban-user': {
                const { uid } = payload;
                if (!uid) return res.status(400).json({ error: 'UID required' });

                await firebaseFetch(`users/${uid}`, 'PATCH', {
                    isBanned: false,
                    banReason: null,
                    banExpiresAt: null
                });
                return res.status(200).json({ success: true, message: 'User unbanned' });
            }

            // APPROVE UNBAN APPEAL
            case 'approve-appeal': {
                const { uid } = payload;
                if (!uid) return res.status(400).json({ error: 'UID required' });

                await firebaseFetch(`users/${uid}`, 'PATCH', {
                    isBanned: false,
                    banReason: null,
                    banExpiresAt: null
                });
                await firebaseFetch(`appeals/${uid}`, 'DELETE');
                return res.status(200).json({ success: true, message: 'Appeal approved & user reinstated' });
            }

            // REJECT UNBAN APPEAL
            case 'reject-appeal': {
                const { uid } = payload;
                if (!uid) return res.status(400).json({ error: 'UID required' });

                await firebaseFetch(`appeals/${uid}`, 'DELETE');
                return res.status(200).json({ success: true, message: 'Appeal dismissed' });
            }

            // APPROVE PREMIUM BUY REQUEST (UTR)
            case 'approve-premium-request': {
                const { rId, uid } = payload;
                if (!uid) return res.status(400).json({ error: 'UID required' });

                // 1. Grant VIP
                await firebaseFetch(`users/${uid}`, 'PATCH', {
                    isPremium: true,
                    isVerified: true,
                    verifiedTickColor: 'text-blue-500'
                });

                // 2. Remove from requests queue
                if (rId) await firebaseFetch(`premium_requests/${rId}`, 'DELETE');

                // 3. Send official message
                const welcomeId = [OFFICIAL_SYSTEM_UID, uid].sort().join('_');
                const now = Date.now();
                const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                await firebaseFetch(`chats/${welcomeId}/messages`, 'POST', {
                    senderId: OFFICIAL_SYSTEM_UID,
                    text: encryptData(`Payment Verified! 🌟\n\nCongratulations! Your account has been upgraded to Chatrix Premium VIP. You now have the verified badge and exclusive profile color access.`),
                    timestamp: now,
                    time: timeStr
                });

                await firebaseFetch(`userChats/${uid}/${welcomeId}`, 'PATCH', {
                    id: welcomeId,
                    targetUid: OFFICIAL_SYSTEM_UID,
                    name: 'Chatrix',
                    username: 'chatrix_official',
                    dp: 'https://placehold.co/150/2563eb/ffffff?text=CX',
                    isVerified: true,
                    isOfficial: true,
                    lastMessage: encryptData(`Premium VIP Activated! 🌟`),
                    timestamp: now,
                    unread: true
                });

                return res.status(200).json({ success: true, message: 'Premium VIP activated for user' });
            }

            // REJECT PREMIUM BUY REQUEST
            case 'reject-premium-request': {
                const { rId, uid } = payload;
                if (rId) await firebaseFetch(`premium_requests/${rId}`, 'DELETE');

                if (uid) {
                    const welcomeId = [OFFICIAL_SYSTEM_UID, uid].sort().join('_');
                    const now = Date.now();
                    const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    await firebaseFetch(`chats/${welcomeId}/messages`, 'POST', {
                        senderId: OFFICIAL_SYSTEM_UID,
                        text: encryptData(`Payment Update: We could not verify your payment UTR. Please ensure the transaction succeeded and submit again with the valid 12-digit number.`),
                        timestamp: now,
                        time: timeStr
                    });
                }
                return res.status(200).json({ success: true, message: 'Request dismissed' });
            }

            // REVOKE PREMIUM
            case 'revoke-premium': {
                const { uid } = payload;
                if (!uid) return res.status(400).json({ error: 'UID required' });

                await firebaseFetch(`users/${uid}`, 'PATCH', {
                    isPremium: false,
                    isVerified: false,
                    verifiedTickColor: null,
                    profileGradient: null,
                    profilePatternIcon: null
                });
                return res.status(200).json({ success: true, message: 'Premium revoked' });
            }

            // GRANT PREMIUM MANUALLY
            case 'grant-premium': {
                const { uid, tickColor } = payload;
                if (!uid) return res.status(400).json({ error: 'UID required' });

                await firebaseFetch(`users/${uid}`, 'PATCH', {
                    isPremium: true,
                    isVerified: true,
                    verifiedTickColor: tickColor || 'text-blue-500'
                });
                return res.status(200).json({ success: true, message: 'Premium granted' });
            }

            // EDIT USER
            case 'edit-user': {
                const { uid, name, password } = payload;
                if (!uid) return res.status(400).json({ error: 'UID required' });

                const patchData = {};
                if (name) patchData.name = name.trim();
                if (password) patchData.password = encryptData(password.trim());

                await firebaseFetch(`users/${uid}`, 'PATCH', patchData);
                return res.status(200).json({ success: true, message: 'User updated' });
            }

            // DELETE USER
            case 'delete-user': {
                const { uid } = payload;
                if (!uid) return res.status(400).json({ error: 'UID required' });

                await firebaseFetch(`users/${uid}`, 'DELETE');
                await firebaseFetch(`appeals/${uid}`, 'DELETE');
                return res.status(200).json({ success: true, message: 'User deleted' });
            }

            // TOGGLE MAINTENANCE
            case 'toggle-maintenance': {
                const { enabled } = payload;
                await firebaseFetch('settings/maintenance', 'PUT', Boolean(enabled));
                return res.status(200).json({ success: true, enabled: Boolean(enabled) });
            }

            default:
                return res.status(400).json({ error: 'Unknown API action' });
        }
    } catch (err) {
        console.error("API error:", err);
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
}

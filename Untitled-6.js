// =========================================================================
// thachkhanh.js - Bộ script toàn diện Locket Gold VIP & AI Filter Engine
// Tác giả: Nguyễn Thạch Khánh
// Phiên bản: 9.2 (Đồng bộ 100% DNS VPS: Fix upload ảnh mất mạng, Fix tải ảnh Photobooth & AI, 42 Filters & Frames, Video 45s, 5 bộ Caption)
// Hỗ trợ: Shadowrocket / Surge / Loon / Quantumult X
// =========================================================================

(function() {
    const hasResponse = typeof $response !== "undefined" && $response !== null;
    const hasRequest = typeof $request !== "undefined" && $request !== null;
    const url = (hasRequest && $request.url) ? $request.url : (hasResponse && $response.url ? $response.url : "");

    // Helper: Giải mã Base64 an toàn trên mọi JavaScript Runtime
    function decodeBase64Safe(b64) {
        if (typeof atob !== "undefined") {
            try { return decodeURIComponent(escape(atob(b64))); } catch (_) {}
        }
        if (typeof Buffer !== "undefined") {
            try { return Buffer.from(b64, "base64").toString("utf-8"); } catch (_) {}
        }
        try {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
            let str = String(b64).replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
            let output = "";
            for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
                buffer = chars.indexOf(buffer);
            }
            return decodeURIComponent(escape(output));
        } catch (_) {
            return "";
        }
    }

    // Helper: Giải mã UID từ header Authorization (JWT Token Firebase)
    function extractUidFromAuthHeader(authHeader) {
        if (!authHeader || typeof authHeader !== "string") return "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        const parts = token.split(".");
        if (parts.length >= 2) {
            try {
                let base64Url = parts[1];
                let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
                while (base64.length % 4) base64 += "=";
                let jsonPayload = decodeBase64Safe(base64);
                if (jsonPayload) {
                    const payload = JSON.parse(jsonPayload);
                    return String(payload.user_id || payload.sub || payload.uid || "").trim();
                }
            } catch (_) {}
        }
        return "";
    }

    // Tự động trích xuất và ghi nhớ UID nếu có Authorization header
    if (hasRequest && $request && $request.headers) {
        const reqAuth = $request.headers["Authorization"] || $request.headers["authorization"] || "";
        const extractedUid = extractUidFromAuthHeader(reqAuth);
        if (extractedUid && !extractedUid.startsWith("$RCAnonymousID") && typeof $persistentStore !== "undefined") {
            $persistentStore.write(extractedUid, "shadow_locket_uid");
        }
    }

    // 0. Manual test mode trên Shadowrocket
    if (!hasResponse && url && url.includes("raw.githubusercontent.com")) {
        if (typeof $done !== "undefined") {
            $done({
                response: {
                    status: 200,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                    body: JSON.stringify({
                        "status": "success",
                        "module": "locketthachkhanh",
                        "version": "9.0",
                        "author": "Nguyễn Thạch Khánh",
                        "message": "Module Locket Gold & Filter VIP v9.0 đồng bộ 100% hệ thống DNS VPS hoạt động hoàn hảo!"
                    })
                }
            });
        }
        return;
    }

    // Cho phép toàn bộ cloudfunctions đi thẳng về máy chủ gốc của Locket
    if (url.includes("cloudfunctions.net")) {
    $done({});
    return;
    }

    // Cấu hình thông báo Chống Scam & Chúc mừng Lên Gold DÀNH RIÊNG CHO SHADOWROCKET (thachkhanhs)
    const CUSTOM_POPUP_CONFIG = {
        "tag": "LOCKET GOLD VIP",
        "tag_gradient": true,
        "tag_style": "gold_gradient",
        "title": "Đã lên Gold rồi nhé! ✨",
        "feature_set": [{
            "title": "Locket Free By Nguyễn Thạch Khánh",
            "body": "IG: @thachkhanhs",
            "imageURL": "https://res.cloudinary.com/mfhcwkhs/image/upload/f_auto,q_auto/H%E1%BB%93_s%C6%A1_Locket_v%C3%A0ng_sang_tr%E1%BB%8Dng"
        }],
        "primary_button_title": "Vào Dùng Ngay",
        "campaign": "locket_gold_welcome_shadow",
        "start_at": "2020-01-01T00:00:00",
        "end_at": "2099-12-31T23:59:59",
        "use_local_time_zone": true
    };

// 1. Danh sách Prompt AI độc quyền của hệ thống DNS VPS 
    const DNS_AI_PROMPTS = {
        "stk_tai_tho": "Keep the person's exact face, expression, pose, and background from the photo, and realistically place a cute fluffy white and soft pink plush bunny ears headband sitting naturally on top of their head with matching soft lighting and natural shadows. If there are multiple people, put a matching bunny ears headband on each person cleanly.",
        "stk_mu_ngu_khoc": "Apply the exact cartoon face filter from the reference image to the person's face. 1. A cream-colored pixel-art sleeping hat with thick black pixel outlines and a light cyan fluffy pom-pom on the left side. 2. Large, thin, perfectly round black wire-frame glasses. 3. Two exaggerated glossy cyan-blue anime crying streams. 4. A tiny black spiral doodle on the nose. 5. Two small curved black whisker-like lines on each cheek. Preserve original face and background.",
        "stk_jollibee": "Edit the uploaded photograph. Keep the exact same person from the original image. Change ONLY the person's clothing into a realistic Jollibee restaurant employee uniform: bright red polo, yellow panels, blue-yellow collar, embroidered mascot logo on left chest, dark navy trousers.",
        "stk_nak_ve_than": "Transform the person in the uploaded photograph into a photorealistic real-life cosplay version of Nakroth – Dimensional Guardian from Arena of Valor: signature voluminous layered silver-white spiky hair with center part and shoulder-length side locks, cropped black fitted blazer with white piping, deep royal-blue necktie with gold four-point star, lavender-blue trousers.",
        "stk_gojo_satoru": "Edit the provided reference image while strictly preserving its original framing and crop. Localized character appearance and outfit replacement: spiky silver-white hair, black blindfold covering both eyes, black high-collar Gojo uniform jacket. Photorealistic cosplay.",
        "stk_shopee_food": "Edit the uploaded photograph. Transform the person into a realistic real-life ShopeeFood delivery employee wearing an authentic ShopeeFood rider uniform: vibrant orange delivery jacket with white branding, orange helmet, dark trousers. Ultra-photorealistic."
    };

    // 2. Bộ chọn Filter nhanh qua Tiểu sử (Bio Selector 1..12) chuẩn hệ thống DNS
    const BIO_NUMBER_TO_FILTER = {
        "1": "stk_tai_tho",
        "2": "stk_mu_ngu_khoc",
        "3": "stk_jollibee",
        "4": "stk_nak_ve_than",
        "5": "stk_gojo_satoru",
        "6": "stk_shopee_food",
        "7": "hom_nay_an_gi",
        "8": "pb_cortis_4cut",
        "9": "pb_shinchan_4cut",
        "10": "pb_supperman_4cut",
        "11": "pb_meo_dang_yeu_4cut",
        "12": "frame_ba_khi"
    };

    const SELECTED_FILTER_KEY = "LOCKET_SELECTED_FILTER";

    // =========================================================================
    // 1. CHIỀU RESPONSE (Nhận phản hồi từ Server)
    // =========================================================================
    if (hasResponse) {
        let body = $response.body;

        // 1.1 XỬ LÝ PHẢN HỒI BỘ LỌC AI & PHOTOBOOTH TỪ CLOUD ENGINE
        if (url.includes("generateFilteredImage") || url.includes("createOverlay") || url.includes("generateFilter") || url.includes("applyFilter")) {
            try {
                let resObj = JSON.parse(body || "{}");
                delete resObj.error;
                delete resObj.errors;
                if (resObj.result) {
                    delete resObj.result.error;
                    delete resObj.result.errors;
                }
                $done({
                    status: 200,
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Access-Control-Allow-Origin": "*"
                    },
                    body: JSON.stringify(resObj)
                });
                return;
            } catch (_) {
                $done({});
                return;
            }
        }

        // 1.2 REVENUECAT GOLD VIP
        if (url.includes("revenuecat.com")) {
            try {
                // Xử lý gói Offerings (Locket gói năm)
                if (url.includes("/offerings")) {
                    let offObj = {};
                    try { offObj = JSON.parse(body || "{}"); } catch (_) { offObj = {}; }
                    offObj.current_offering_id = "default";
                    offObj.offerings = [{
                        "description": "Locket Gold VIP",
                        "identifier": "default",
                        "packages": [{
                            "identifier": "$rc_annual",
                            "platform_product_identifier": "locket_3600_1y"
                        }]
                    }];
                    $done({
                        status: 200,
                        headers: { "Content-Type": "application/json; charset=utf-8" },
                        body: JSON.stringify(offObj)
                    });
                    return;
                }

                // Xử lý Product Entitlement Mapping
                if (url.includes("product_entitlement_mapping")) {
                    $done({
                        status: 200,
                        headers: { "Content-Type": "application/json; charset=utf-8" },
                        body: JSON.stringify({
                            "product_entitlement_mapping": {
                                "locket_3600_1y": {
                                    "entitlements": ["Gold", "locket_gold"]
                                }
                            }
                        })
                    });
                    return;
                }

                let obj = {};
                try {
                    obj = JSON.parse(body || "{}");
                } catch (_) {
                    obj = {};
                }
                if (!obj || typeof obj !== "object") obj = {};
                if (!obj.subscriber) obj.subscriber = {};

                let appUid = "";
                const m = url.match(/\/subscribers\/([^\/\?]+)/);
                if (m && m[1]) appUid = decodeURIComponent(m[1]);
                if (!appUid && hasRequest && $request && $request.body) {
                    try {
                        const reqObj = JSON.parse($request.body);
                        appUid = reqObj.app_user_id || "";
                    } catch (_) {}
                }

                if (appUid && !appUid.startsWith("$RCAnonymousID") && typeof $persistentStore !== "undefined") {
                    $persistentStore.write(appUid, "shadow_locket_uid");
                }

                const purchaseDate = "2024-01-01T00:00:00Z";
                const expiresDate = "2099-12-31T23:59:59Z";
                const nowIso = new Date().toISOString();
                const nowMs = Date.now();

                const goldEntitlement = {
                    "expires_date": expiresDate,
                    "grace_period_expires_date": null,
                    "product_identifier": "locket_3600_1y",
                    "purchase_date": purchaseDate,
                    "is_active": true,
                    "will_renew": true,
                    "period_type": "normal",
                    "latest_purchase_date": purchaseDate,
                    "original_purchase_date": purchaseDate,
                    "store": "app_store",
                    "ownership_type": "PURCHASED",
                    "product_plan_identifier": null
                };

                const goldSub = {
                    "auto_resume_date": null,
                    "billing_issues_detected_at": null,
                    "display_name": "locket_gold_annual",
                    "expires_date": expiresDate,
                    "grace_period_expires_date": null,
                    "is_sandbox": false,
                    "management_url": "https://apps.apple.com/account/subscriptions",
                    "original_purchase_date": purchaseDate,
                    "ownership_type": "PURCHASED",
                    "period_type": "normal",
                    "product_plan_identifier": null,
                    "purchase_date": purchaseDate,
                    "refunded_at": null,
                    "store": "app_store",
                    "unsubscribe_detected_at": null
                };

                obj.request_date = nowIso;
                obj.request_date_ms = nowMs;

                obj.subscriber.entitlements = {
                    "Gold": goldEntitlement,
                    "gold": goldEntitlement,
                    "locket_gold": goldEntitlement,
                    "locket_gold_annual": goldEntitlement,
                    "premium": goldEntitlement,
                    "Premium": goldEntitlement,
                    "pro": goldEntitlement,
                    "Pro": goldEntitlement,
                    "camera_filters": goldEntitlement,
                    "camera_filter": goldEntitlement,
                    "filters": goldEntitlement,
                    "filter": goldEntitlement,
                    "ai_filters": goldEntitlement,
                    "ai_filter": goldEntitlement,
                    "photobooth": goldEntitlement,
                    "vip": goldEntitlement
                };

                obj.subscriber.subscriptions = {
                    "locket_3600_1y": goldSub,
                    "locket_gold_annual": goldSub,
                    "com.locket.gold.annual": goldSub,
                    "com.locket.gold.yearly": goldSub,
                    "locket_gold_yearly": goldSub,
                    "locket_gold_monthly": goldSub
                };

                obj.subscriber.original_purchase_date = purchaseDate;
                obj.subscriber.first_seen = purchaseDate;
                obj.subscriber.original_app_user_id = appUid || "NFxs1WImrgPJkN4wNJjWR150pyY2";

                let respHeaders = Object.assign({}, $response.headers || {});
                delete respHeaders["Content-Encoding"];
                delete respHeaders["content-encoding"];
                delete respHeaders["Content-Length"];
                delete respHeaders["content-length"];
                delete respHeaders["Transfer-Encoding"];
                delete respHeaders["transfer-encoding"];
                delete respHeaders["X-RevenueCat-ETag"];
                delete respHeaders["x-revenuecat-etag"];
                delete respHeaders["ETag"];
                delete respHeaders["etag"];
                respHeaders["Content-Type"] = "application/json; charset=utf-8";

                $done({
                    status: 200,
                    headers: respHeaders,
                    body: JSON.stringify(obj)
                });
                return;
            } catch (e) {
                $done({});
                return;
            }
        }

        // 1.3 MỞ KHÓA FIREBASE REMOTE CONFIG (ĐỒNG BỘ 100% CẤU HÌNH DNS VPS)
        if (url.includes("firebaseremoteconfig")) {
            try {
                let obj = {};
                try {
                    obj = JSON.parse(body || "{}");
                } catch (_) {
                    obj = {};
                }
                if (!obj || typeof obj !== "object") obj = {};

                obj.state = "UPDATE";
                obj.templateVersion = String(Date.now());
                obj.appName = "com.locket.Locket";

                let entries = obj.entries || {};
                entries["cache_ttl_seconds"] = "0";
                entries["client_cache_ttl_sec"] = "0";

                // 1. Bật toàn diện 39 Feature gates
                let fg = {};
                try {
                    fg = JSON.parse(entries["feature_gates"] || "{}");
                } catch (_) {
                    fg = {};
                }
                const gatesToEnable = [
                    "app_icon_picker", "camera_roll", "camera_roll_video", "camera_roll_video_30s",
                    "camera_roll_video_upload", "camera_theme", "locket_views", "long_captions",
                    "longer_video", "longer_video_30s", "photo_library_video", "can_upload_30s_video",
                    "can_record_30s_video", "unlimited_friends", "priority_support", "profile_badge",
                    "profileBadge", "remove_ads", "video", "video_30s", "video_60s", "custom_widget_frames",
                    "streaks", "groups", "camera_filter_sheet", "camera_filters", "camera_filter",
                    "filter", "filters", "photo_filters", "ai_filters", "holiday_effects",
                    "holiday_filters", "ar_filters", "face_filters", "camera_filter_button",
                    "custom_filters", "create_filter", "extended_video_30s"
                ];
                for (const g of gatesToEnable) fg[g] = "enabled";
                entries["feature_gates"] = JSON.stringify(fg);

                // 2. Video dài 45s & Quay phim dài chuẩn DNS VPS
                entries["video_duration"] = "45";
                entries["video_max_duration"] = "45.0";
                entries["gold_max_duration"] = "45.0";
                entries["goldMaxDuration"] = "45.0";
                entries["max_video_duration"] = "45";
                entries["max_video_length"] = "45";
                entries["max_video_length_seconds"] = "45";
                entries["video_length_seconds"] = "45";
                entries["video_duration_seconds"] = "45";
                entries["max_video_duration_seconds"] = "45";
                entries["video_recording_duration_seconds"] = "45";
                entries["can_record_video_duration_seconds"] = "45";
                entries["extended_video_length_seconds"] = "45";
                entries["longer_video_duration_seconds"] = "45";
                entries["longer_videos_enabled"] = "true";
                entries["longer_video_enabled"] = "true";
                entries["can_record_long_video"] = "true";
                entries["long_video_enabled"] = "true";
                entries["longer_video_max_duration"] = "45";
                entries["video_quality_mbps"] = "0.7";
                entries["camera_quality_mbps"] = "0.7";
                entries["video_bitrate"] = "700000";
                entries["camera_volume_button_enabled"] = "true";
                entries["camera_microphone_enabled"] = "true";
                entries["video_sound_enabled"] = "true";

                // 3. Tải Video từ Thư Viện / Camera Roll (45s) chuẩn DNS VPS
                entries["camera_roll_max_duration"] = "45.0";
                entries["camera_roll_video_max_duration"] = "45.0";
                entries["camera_roll_duration"] = "45.0";
                entries["video_trim_max_duration"] = "45.0";
                entries["trim_max_duration"] = "45.0";
                entries["longer_camera_roll_videos_enabled"] = "true";
                entries["camera_roll_video_upload_enabled"] = "true";
                entries["camera_roll_video_enabled"] = "true";
                entries["camera_roll_preview_enabled"] = "true";
                entries["internal_camera_roll_video_upload_enabled"] = "true";
                entries["camera_roll_quality_mbps"] = "0.7";
                entries["camera_roll"] = JSON.stringify({
                    "gold_max_duration": 45.0,
                    "max_duration": 45.0,
                    "video_max_duration": 45.0,
                    "video_length": 45.0,
                    "quality_mbps": 0.6,
                    "video": true,
                    "video_enabled": true,
                    "upload_enabled": true,
                    "allow_video": true
                });
                entries["camera"] = JSON.stringify({
                    "gold_max_duration": 45.0,
                    "max_duration": 45.0,
                    "ultra_wide": true,
                    "video_max_duration": 45.0,
                    "video_duration": 45.0
                });
                entries["camera_config"] = JSON.stringify({
                    "gold_max_duration": 45.0,
                    "max_duration": 45.0,
                    "ultra_wide": true,
                    "video_max_duration": 45.0,
                    "video_duration": 45.0
                });
                entries["max_friends_count"] = "999999";
                entries["signup_max_friends_count"] = "999999";
                entries["unlimited_max_friend_count"] = "999999";
                entries["soft_friend_limit_threshold_count"] = "999999";
                entries["unlimited_friends_prompt_config"] = JSON.stringify({"minimum_friends_count": 0, "show": false});

                // 7. Bảo vệ lượt xem Moment, thông báo người xem và thả cảm xúc chuẩn DNS VPS
                entries["get_moment_views_as_cloud_function"] = "false";
                entries["moment_views_enabled"] = "true";
                entries["moment_views_v2"] = "true";
                entries["record_moment_views"] = "true";
                entries["notify_moment_views"] = "true";
                entries["moment_reactions_v2"] = "true";
                entries["fetch_moments_in_conversation"] = "true";
                entries["chat_read_receipts"] = "true";
                entries["chat_read_receipts_mark_as_delivered_extension"] = "true";
                entries["android_mark_moment_as_viewed"] = "true";
                entries["android_get_latest_moment_v2"] = "true";
                entries["get_latest_moment_v2"] = "true";

                // 8. Kích hoạt cờ Locket Gold vĩnh viễn chuẩn DNS VPS
                entries["gold_subscription_override"] = "true";
                entries["android_gold_subscription_override"] = "true";
                entries["is_gold"] = "true";
                entries["has_gold"] = "true";
                entries["gold_active"] = "true";
                entries["v2_refresh"] = "true";

                // 9. Cấu hình khung viền widget ngoài màn hình chính (frame_ba_khi)
                const custom_frame_obj = JSON.stringify({
                    "uid": "frame_mphong_1",
                    "url": "https://filter.phong200614.workers.dev/assets/frames/frame_ba_khi.png",
                    "placement": "above",
                    "use_local_time_zone": true,
                    "start_at": "2024-01-01T00:00:00",
                    "end_at": "2099-12-31T23:59:59"
                });
                entries["widget_frame_event"] = custom_frame_obj;
                entries["synced_widget_frame"] = custom_frame_obj;
                entries["last_synced_widget_frame_event"] = "frame_mphong_1";
                entries["widget_frame_event_enabled"] = "true";
                entries["widget_frame_enabled"] = "true";
                entries["widget_frame_events_enabled"] = "true";

                // 10. Thông báo Lên Gold & Cảnh báo Chống Scam (Vũ Minh Phong)
                entries["feature_discovery_popup_config"] = JSON.stringify(CUSTOM_POPUP_CONFIG);

                // 11. Vô hiệu hóa Paywall & Upsell chặn áp dụng Filter
                entries["paywall_presentation_config"] = JSON.stringify({
                    "uid": "paywall_testflight",
                    "onboarding": false,
                    "after_sent_moment": false,
                    "after_moment": false,
                    "after_capture": false,
                    "on_foreground": false,
                    "holiday_effects": false,
                    "camera_filters": false,
                    "camera_filter": false,
                    "filters": false,
                    "filter": false,
                    "ai_filter": false,
                    "ai_filters": false,
                    "filtered_image": false,
                    "filtered_images": false,
                    "generate_filtered_image": false,
                    "interval": 2592000,
                    "profile_banner": true
                });
                entries["upsell_features"] = JSON.stringify({
                    "app_icon_picker": false,
                    "camera_roll": false,
                    "camera_theme": false,
                    "locket_views": false,
                    "remove_ads": false,
                    "custom_widget_frames": false,
                    "filter": false,
                    "filters": false,
                    "camera_filter": false,
                    "camera_filters": false,
                    "holiday_filter": false,
                    "holiday_filters": false,
                    "ai_filter": false,
                    "ai_filters": false
                });

                if (entries["paywall_config"]) {
                    try {
                        let pw = JSON.parse(entries["paywall_config"]);
                        pw.completed_title = { en: "Đã lên Gold rồi nhé! ✨", vi: "Đã lên Gold rồi nhé! ✨" };
                        pw.completed_subtitle = {
                            en: "Locket Free By Nguyễn Thạch Khánh",
                            vi: "Locket Free By Nguyễn Thạch Khánh"
                        };
                        pw.completed_button_title = { en: "Vào Dùng Ngay", vi: "Vào Dùng Ngay" };
                        entries["paywall_config"] = JSON.stringify(pw);
                    } catch (_) {}
                }

                obj.entries = entries;

                let respHeaders = Object.assign({}, $response.headers || {});
                delete respHeaders["Content-Encoding"];
                delete respHeaders["content-encoding"];
                delete respHeaders["Content-Length"];
                delete respHeaders["content-length"];
                delete respHeaders["Transfer-Encoding"];
                delete respHeaders["transfer-encoding"];
                delete respHeaders["ETag"];
                delete respHeaders["etag"];
                respHeaders["Content-Type"] = "application/json; charset=utf-8";

                $done({
                    status: 200,
                    headers: respHeaders,
                    body: JSON.stringify(obj)
                });
                return;
            } catch (e) {
                $done({});
                return;
            }
        }

        $done({});
        return;
    }

    // =========================================================================
    // 2. CHIỀU REQUEST (Gửi yêu cầu đi)
    // =========================================================================
    const reqUrl = (hasRequest && $request.url) ? $request.url : "";
    let reqHeaders = Object.assign({}, ($request && $request.headers) || {});

    // 2.1 XÓA HEADER CACHE 304 CHO REVENUECAT & FIREBASE REMOTE CONFIG
    if (reqUrl.includes("revenuecat.com") || reqUrl.includes("firebaseremoteconfig")) {
        delete reqHeaders["If-None-Match"];
        delete reqHeaders["if-none-match"];
        delete reqHeaders["If-Modified-Since"];
        delete reqHeaders["if-modified-since"];
        delete reqHeaders["X-RevenueCat-ETag"];
        delete reqHeaders["x-revenuecat-etag"];
        delete reqHeaders["ETag"];
        delete reqHeaders["etag"];
        $done({ headers: reqHeaders });
        return;
    }

    // 2.2 BỘ CHỌN FILTER QUA TIỂU SỬ & CẬP NHẬT PROFILE GOLD
    if (reqUrl.includes("changeProfileInfo")) {
        if (hasRequest && $request.body && typeof $persistentStore !== "undefined") {
            try {
                let bodyText = typeof $request.body === "string" ? $request.body : "";
                if (!bodyText && typeof TextDecoder !== "undefined") {
                    bodyText = new TextDecoder("utf-8").decode($request.body);
                }
                const bodyObj = JSON.parse(bodyText || "{}");
                const dataNode = (bodyObj && bodyObj.data && typeof bodyObj.data === "object") ? bodyObj.data : bodyObj;
                const bioText = String(dataNode.bio || dataNode.status || dataNode.about || "").trim();
                if (bioText === "0" || bioText.toLowerCase() === "off") {
                    $persistentStore.write("", SELECTED_FILTER_KEY);
                } else if (BIO_NUMBER_TO_FILTER[bioText]) {
                    $persistentStore.write(BIO_NUMBER_TO_FILTER[bioText], SELECTED_FILTER_KEY);
                } else if (/^(stk_|pb_|frame_|khung_|photobooth_|hom_nay_)/i.test(bioText)) {
                    $persistentStore.write(bioText, SELECTED_FILTER_KEY);
                }
            } catch (_) {}
        }
        $done({
            response: {
                status: 200,
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({
                    "data": { "badge": "locket_gold", "badge_tier": "gold", "is_gold": true, "success": true },
                    "result": { "badge": "locket_gold", "badge_tier": "gold", "is_gold": true, "success": true }
                })
            }
        });
        return;
    }

    // 2.3 DANH SÁCH BỘ LỌC CHO LOCKET (getFilters / createFilter)
    if (reqUrl.includes("getFilters") || reqUrl.includes("createFilter")) {
        const filterList = (CUSTOM_CAMERA_FILTER_CONFIG && (CUSTOM_CAMERA_FILTER_CONFIG.filters || CUSTOM_CAMERA_FILTER_CONFIG.picker_filters)) || [];
        $done({
            response: {
                status: 200,
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify({
                    "result": { "data": { "filters": filterList }, "status": 200 },
                    "data": { "filters": filterList },
                    "status": 200
                })
            }
        });
        return;
    }

    $done({});
})();
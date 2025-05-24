"use strict";
// Script to create 5 test jobs for companyId "company-susana1-1745631109298" with special plan
// Run with: npx ts-node scripts/seedJobs.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("firebase/app");
var lite_1 = require("firebase/firestore/lite");
var firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBUZ-F0kzPxRdlSkBacI2AnlNe8_-BuSZo",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gate33-b5029.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gate33-b5029",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gate33-b5029.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "823331487278",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:823331487278:web:932f2936eef09e37c3a9bf"
};
var app = !(0, app_1.getApps)().length ? (0, app_1.initializeApp)(firebaseConfig) : (0, app_1.getApps)()[0];
var db = (0, lite_1.getFirestore)(app);
var jobs = [
    {
        title: 'Social Media Post Test 1',
        companyId: 'company-susana1-1745631109298',
        companyName: 'Gate33 Tech',
        location: 'Remote',
        salary: '€40k - €60k',
        shortDescription: 'Work on modern React apps with a dynamic team.',
        jobType: 'Full-time',
        socialMediaPromotion: 4,
        socialMediaPromotionCount: 0,
        planId: 'test-plan-4x-socmed',
        planName: '4x Social Media + Top + Newsletter',
        isTopListed: true,
        highlightedInNewsletter: true,
        paid: true,
        status: 'active',
        createdAt: lite_1.Timestamp.now(),
        expiresAt: lite_1.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    },
    {
        title: 'Social Media Post Test 2',
        companyId: 'company-susana1-1745631109298',
        companyName: 'Gate33 Tech',
        location: 'Lisbon',
        salary: '€45k - €65k',
        shortDescription: 'API and microservices development.',
        jobType: 'Full-time',
        socialMediaPromotion: 4,
        socialMediaPromotionCount: 0,
        planId: 'test-plan-4x-socmed',
        planName: '4x Social Media + Top + Newsletter',
        isTopListed: true,
        highlightedInNewsletter: true,
        paid: true,
        status: 'active',
        createdAt: lite_1.Timestamp.now(),
        expiresAt: lite_1.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    },
    {
        title: 'Social Media Post Test 3',
        companyId: 'company-susana1-1745631109298',
        companyName: 'Gate33 Tech',
        location: 'Remote',
        salary: '€35k - €50k',
        shortDescription: 'Design beautiful and usable interfaces.',
        jobType: 'Contract',
        socialMediaPromotion: 4,
        socialMediaPromotionCount: 0,
        planId: 'test-plan-4x-socmed',
        planName: '4x Social Media + Top + Newsletter',
        isTopListed: true,
        highlightedInNewsletter: true,
        paid: true,
        status: 'active',
        createdAt: lite_1.Timestamp.now(),
        expiresAt: lite_1.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    },
    {
        title: 'Social Media Post Test 4',
        companyId: 'company-susana1-1745631109298',
        companyName: 'Susana Tech',
        location: 'Porto',
        salary: '€50k - €70k',
        shortDescription: 'Cloud infrastructure and CI/CD.',
        jobType: 'Full-time',
        socialMediaPromotion: 4,
        socialMediaPromotionCount: 0,
        planId: 'test-plan-4x-socmed',
        planName: '4x Social Media + Top + Newsletter',
        isTopListed: true,
        highlightedInNewsletter: true,
        paid: true,
        status: 'active',
        createdAt: lite_1.Timestamp.now(),
        expiresAt: lite_1.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    },
    {
        title: 'Social Media Post Test 5',
        companyId: 'company-susana1-1745631109298',
        companyName: 'Gate33 Tech',
        location: 'Remote',
        salary: '€38k - €55k',
        shortDescription: 'Automate tests for web and mobile apps.',
        jobType: 'Full-time',
        socialMediaPromotion: 4,
        socialMediaPromotionCount: 0,
        planId: 'test-plan-4x-socmed',
        planName: '4x Social Media + Top + Newsletter',
        isTopListed: true,
        highlightedInNewsletter: true,
        paid: true,
        status: 'active',
        createdAt: lite_1.Timestamp.now(),
        expiresAt: lite_1.Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    },
];
function seedJobs() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, jobs_1, job, docRef;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _i = 0, jobs_1 = jobs;
                    _a.label = 1;
                case 1:
                    if (!(_i < jobs_1.length)) return [3 /*break*/, 4];
                    job = jobs_1[_i];
                    return [4 /*yield*/, (0, lite_1.addDoc)((0, lite_1.collection)(db, 'jobs'), job)];
                case 2:
                    docRef = _a.sent();
                    console.log("Job created with ID: ".concat(docRef.id));
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
seedJobs().catch(function (err) {
    console.error('Error seeding jobs:', err);
    process.exit(1);
});

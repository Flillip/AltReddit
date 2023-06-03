var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { NotInitialized } from "./errors.js";
function requiresInit(target, key, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Cache.IsInit() === false) {
                return Promise.reject(new NotInitialized('Cache hasn\'t been initialized'));
            }
            return originalMethod.apply(this, args);
        });
    };
    return descriptor;
}
export class Cache {
    static Init(api) {
        this.redditAPI = api;
    }
    static IsInit() {
        return this.redditAPI !== undefined;
    }
    static ClearMe() {
        const local = localStorage.getItem('cache');
        let parsed = JSON.parse(local !== null && local !== void 0 ? local : '{}');
        if (parsed !== undefined && parsed["me"] !== undefined) {
            parsed["me"] = {};
            localStorage.setItem("cache", JSON.stringify(parsed));
        }
    }
    static GetLogo(subreddit) {
        return __awaiter(this, void 0, void 0, function* () {
            const local = localStorage.getItem('cache');
            const parsed = JSON.parse(local || '{}');
            if (local === null || parsed["logos"] === undefined || subreddit in parsed["logos"] === false) {
                const result = yield this.redditAPI.getAbout(subreddit);
                let img = result.data.icon_img.replace(/\?(.*)/g, '');
                if (img === '') {
                    img = result.data.community_icon.replace(/\?(.*)/g, '');
                    if (img === '')
                        img = './static/img/subreddit_default.png';
                }
                if (parsed["logos"] === undefined) {
                    parsed["logos"] = {};
                }
                parsed["logos"][subreddit] = img;
                localStorage.setItem('cache', JSON.stringify(parsed));
            }
            return parsed["logos"][subreddit];
        });
    }
    static GetAboutMe() {
        return __awaiter(this, void 0, void 0, function* () {
            const local = localStorage.getItem('cache');
            const parsed = JSON.parse(local !== null && local !== void 0 ? local : '{}');
            if (local === null || parsed["me"] === undefined) {
                const result = yield this.redditAPI.getAboutMe();
                parsed["me"] = result;
                localStorage.setItem('cache', JSON.stringify(parsed));
            }
            return parsed["me"];
        });
    }
}
__decorate([
    requiresInit
], Cache, "GetLogo", null);
__decorate([
    requiresInit
], Cache, "GetAboutMe", null);

import { RedditAPI } from './api.js';
import { User } from './objects/user.js';
import { NotInitialized } from "./errors.js";


function requiresInit(target: Cache, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {        
        if (Cache.IsInit() === false) {
            return Promise.reject(new NotInitialized('Cache hasn\'t been initialized'));
        }
        return originalMethod.apply(this, args);
    }
    return descriptor;
}


export class Cache {
    private static redditAPI: RedditAPI;

    static Init(api: RedditAPI) {
        this.redditAPI = api;
    }

    static IsInit() {
        return this.redditAPI !== undefined;
    }

    static ClearMe() {
        const local = localStorage.getItem('cache');
        let parsed = JSON.parse(local ?? '{}');
        if (parsed !== undefined && parsed["me"] !== undefined) {
            parsed["me"] = {};
            localStorage.setItem("cache", JSON.stringify(parsed));
        }
    }

    @requiresInit
    static async GetLogo(subreddit: string): Promise<string> {
        const local = localStorage.getItem('cache');
        const parsed = JSON.parse(local || '{}');

        if (local === null || parsed["logos"] === undefined || subreddit in parsed["logos"] === false) {
            const result = await this.redditAPI.getAbout(subreddit);
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
    }

    @requiresInit
    static async GetAboutMe(): Promise<User> {
        const local = localStorage.getItem('cache');
        const parsed = JSON.parse(local ?? '{}');

        if (local === null || parsed["me"] === undefined) {
            const result = await this.redditAPI.getAboutMe();
            parsed["me"] = result as User;
            localStorage.setItem('cache', JSON.stringify(parsed));

        }
        
        return parsed["me"] as User;
    }
}
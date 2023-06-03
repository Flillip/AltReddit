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
import { randomString } from "./math.js";
import { NoToken } from "./errors.js";
import { parameters, queueError } from "../script.js";
import { Cache } from "./cache.js";
const CLIENT_ID = "9xk8vLeZJDsWbBSkfHuARw";
const REDIRECT_URI = "http://localhost:5000";
const API_ENDPOINT = "https://oauth.reddit.com/";
const REDDIT = "https://reddit.com/";
function requiresToken(target, key, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = localStorage.getItem('access_token');
            if (token === null) {
                return Promise.reject(new NoToken('No token has been loaded'));
            }
            return originalMethod.apply(this, args);
        });
    };
    return descriptor;
}
export class RedditAPI {
    get AccessToken() {
        return this.access_token;
    }
    get ExpiryDate() {
        return this.expiry_date;
    }
    constructor() {
        var _a, _b, _c;
        Cache.Init(this);
        this.access_token = (_a = localStorage.getItem('access_token')) !== null && _a !== void 0 ? _a : '';
        this.refresh_token = (_b = localStorage.getItem('refresh_token')) !== null && _b !== void 0 ? _b : '';
        this.expiry_date = new Date((_c = localStorage.getItem('expiry_date')) !== null && _c !== void 0 ? _c : Date.now());
        // check if user is logged in
        // and token is still valid
        if (this.access_token !== '') {
            if (this.expiry_date < new Date(Date.now())) {
                console.log("Token expired. Refreshing");
                this.refreshToken();
            }
            else {
                console.log(this.expiry_date.getTime() - new Date(Date.now()).getTime());
                let checkDateInterval = setInterval(() => {
                    console.log("Refreshing token");
                    this.refreshToken();
                    clearInterval(checkDateInterval);
                }, this.expiry_date.getTime() - new Date(Date.now()).getTime());
            }
        }
        // this.getAboutMe = tokenCheck(this, 'getAboutMe', Object.getOwnPropertyDescriptor(RedditAPI.prototype, 'getAboutMe').value);
    }
    login() {
        const state = randomString(16);
        localStorage.setItem('state', state);
        window.open(`${REDDIT}api/v1/authorize.compact?client_id=${CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${REDIRECT_URI}&duration=permanent&scope=identity,mysubreddits,save,read,vote`, "_self");
    }
    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('expiry_date');
        const cache = JSON.parse(localStorage.getItem('cache') || '{}');
        delete cache["Me"];
        localStorage.setItem('cache', JSON.stringify(cache));
        window.location.reload();
    }
    getToken() {
        const has_error = parameters.has('error');
        if (has_error) {
            queueError(`Error getting authorization: ${parameters.get('error')}`);
            return;
        }
        const code = parameters.get('code');
        if (code == null) {
            queueError(`Code is null`);
            return;
        }
        fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + btoa(CLIENT_ID + ':'),
                'User-Agent': 'clone v1.0: u/bonnietogamer',
            }
        }).then(response => response.json())
            .then(data => {
            this.saveData(data, "Error getting token");
            window.location.replace('/');
        });
    }
    /**
     * Refreshes the token
     */
    refreshToken() {
        const tokenEndpoint = 'https://www.reddit.com/api/v1/access_token';
        const body = new FormData();
        // fetch body
        body.append('grant_type', 'refresh_token');
        body.append('refresh_token', this.refresh_token);
        body.append('User-Agent', 'clone v1.0: u/bonnietogamer');
        fetch(tokenEndpoint, {
            method: 'POST',
            body: body,
            headers: {
                'Authorization': 'Basic ' + btoa(CLIENT_ID + ':')
            }
        }).then(response => response.json())
            .then(data => {
            this.saveData(data, "Error refreshing token");
        });
    }
    addSeconds(date, seconds) {
        date.setSeconds(date.getSeconds() + seconds);
        return date;
    }
    /**
     * Saves the token data returned from reddit.
     * @param {Object} data
     */
    saveData(data, error_msg) {
        if (data.error) {
            queueError(`${error_msg}: ${data.error}`);
            return;
        }
        const access_token = data.access_token;
        const refresh_token = data.refresh_token;
        const expires_in = Number(data.expires_in);
        console.log(new Date(Date.now()));
        console.log(expires_in);
        console.log(this.addSeconds(new Date(Date.now()), expires_in));
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('expiry_date', this.addSeconds(new Date(Date.now()), expires_in).toJSON());
    }
    Get(url, endpoint = '', noHead = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield fetch((endpoint === '' ? API_ENDPOINT : endpoint) + url, {
                method: 'GET',
                headers: noHead === false ? {
                    'Authorization': `bearer ${this.access_token}`
                } : {}
            });
        });
    }
    Post(url, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const urlEncoded = new URLSearchParams(data);
            return yield fetch(API_ENDPOINT + url, {
                method: 'POST',
                headers: {
                    'Authorization': `bearer ${this.access_token}`
                },
                body: urlEncoded
            });
        });
    }
    /**
     * Returns the identity of the logged in user.
     * *Requires token*
     */
    getAboutMe() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.Get('api/v1/me');
            return yield response.json();
        });
    }
    /**
     * Get's the user's homepage
     */
    getHome() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.Get('.json');
            const data = yield response.json();
            const array = [];
            console.log(data);
            console.log('Length: ', data.data.children);
            for (let post of data.data.children) {
                array.push(post.data);
            }
            return array;
        });
    }
    getSubreddit(subreddit) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.Get(`r/${subreddit}.json`);
            const data = yield response.json();
            const array = [];
            console.log(data);
            console.log('Length: ', data.data.children);
            for (let post of data.data.children) {
                array.push(post.data);
            }
            return array;
        });
    }
    getUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.Get(`user/${user}.json`, 'https://www.reddit.com/', true);
            const data = yield response.json();
            const array = [];
            console.log(data);
            console.log('Length: ', data.data.children);
            for (let post of data.data.children) {
                // t1 is comment.
                if (post.kind === 't1')
                    continue;
                array.push(post.data);
            }
            return array;
        });
    }
    /**
     * Get's the about page of a subreddit
     */
    getAbout(subreddit) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.Get(`r/${subreddit}/about.json`);
            const data = yield response.json();
            console.log(data);
            return data;
        });
    }
    savePost(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.Post(`api/save`, { 'id': id });
            console.log(yield response.json());
        });
    }
    unsavePost(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.Post(`api/unsave`, { 'id': id });
        });
    }
    /**
     * Casts a vote on a reddit post
     * @param id The id of the post
     * @param vote Taken from reddit's API: indicates the direction of the vote. Voting 1 is an upvote, -1 is a downvote, and 0 is equivalent to "un-voting" by clicking again on a highlighted arrow
     */
    votePost(id, vote) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.Post(`api/vote`, { 'id': id, 'dir': vote.toString() });
        });
    }
    getComments(subreddit, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.Get(`r/${subreddit}/comments/${id}.json`);
            const data = yield response.json();
            const jsonComments = data[1].data.children;
            const comments = [];
            for (let i = 0; i < jsonComments.length; i++) {
                if (jsonComments[i].kind !== 't1')
                    continue;
                comments.push(jsonComments[i].data);
            }
            return comments;
        });
    }
}
__decorate([
    requiresToken
], RedditAPI.prototype, "getAboutMe", null);
__decorate([
    requiresToken
], RedditAPI.prototype, "savePost", null);
__decorate([
    requiresToken
], RedditAPI.prototype, "unsavePost", null);
__decorate([
    requiresToken
], RedditAPI.prototype, "votePost", null);

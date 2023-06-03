import { randomString } from "./math.js";
import { NoToken } from "./errors.js";
import { parameters, queueError } from "../script.js";
import { Post } from "./objects/post.js";
import { RedditComment } from "./objects/comment.js";
import { SubredditAbout } from "./objects/subreddit_about.js";
import { User } from "./objects/user.js";
import { Cache } from "./cache.js";

const CLIENT_ID    = "9xk8vLeZJDsWbBSkfHuARw";
const REDIRECT_URI = "http://localhost:5000";
const API_ENDPOINT = "https://oauth.reddit.com/"
const REDDIT       = "https://reddit.com/";

function requiresToken(target: RedditAPI, key: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
        const token = localStorage.getItem('access_token');
        
        if (token === null) {
            return Promise.reject(new NoToken('No token has been loaded'));
        }
        return originalMethod.apply(this, args);
    }
    return descriptor;
}

export class RedditAPI {
    private access_token: string;
    private refresh_token: string;
    private expiry_date: Date;

    public get AccessToken() {
        return this.access_token;
    }

    public get ExpiryDate() {
        return this.expiry_date;
    }

    constructor() {
        Cache.Init(this);

        this.access_token = localStorage.getItem('access_token') ?? '';
        this.refresh_token = localStorage.getItem('refresh_token') ?? '';
        this.expiry_date = new Date(localStorage.getItem('expiry_date') ?? Date.now());

        // check if user is logged in
        // and token is still valid
        if (this.access_token !== '') {
            if (this.expiry_date < new Date(Date.now())) {
                console.log("Token expired. Refreshing");
                this.refreshToken();
            } else {
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
    
        window.open(
            `${REDDIT}api/v1/authorize.compact?client_id=${CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${REDIRECT_URI}&duration=permanent&scope=identity,mysubreddits,save,read,vote`,
            "_self"
        );
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
    private refreshToken() {
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
    
    private addSeconds(date: Date, seconds: number) {
        date.setSeconds(date.getSeconds() + seconds);
        return date;
    }

    /**
     * Saves the token data returned from reddit.
     * @param {Object} data 
     */
    private saveData(data: any, error_msg: string) {
        if (data.error) {
            queueError(`${error_msg}: ${data.error}`);
            return;
        }
        
        const access_token = data.access_token;
        const refresh_token = data.refresh_token;
        const expires_in = Number(data.expires_in);
        console.log(new Date(Date.now()));
        console.log(expires_in);
        console.log(this.addSeconds(new Date(Date.now()), expires_in))
        

        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('expiry_date', this.addSeconds(new Date(Date.now()), expires_in).toJSON());
    }

    private async Get(url: String, endpoint: string = '', noHead: boolean = false) {
        return await fetch((endpoint === '' ? API_ENDPOINT : endpoint) + url, {
            method: 'GET',
            headers: noHead === false ? {
                'Authorization': `bearer ${this.access_token}`
            } : {}
        });
    }

    private async Post(url: string, data: {[key: string]: string;}) {
        const urlEncoded = new URLSearchParams(data);
        
        return await fetch(API_ENDPOINT + url, {
            method: 'POST',
            headers: {
                'Authorization': `bearer ${this.access_token}`
            },
            body: urlEncoded
        })
    }

    /**
     * Returns the identity of the logged in user.
     * *Requires token*
     */
    @requiresToken
    async getAboutMe(): Promise<User> {
        const response = await this.Get('api/v1/me');
        return await response.json() as User;
    }

    /**
     * Get's the user's homepage
     */
    async getHome() {
        const response = await this.Get('.json');
        const data = await response.json();
        const array: Post[] = [];
        console.log(data);
        console.log('Length: ', data.data.children);

        for (let post of data.data.children) {
            array.push(post.data as Post);
        }

        return array;
    }

    async getSubreddit(subreddit: string) {
        const response = await this.Get(`r/${subreddit}.json`);
        const data = await response.json();
        const array: Post[] = [];
        console.log(data);
        console.log('Length: ', data.data.children);

        for (let post of data.data.children) {
            array.push(post.data as Post);
        }

        return array;
    }

    async getUser(user: string) {
        const response = await this.Get(`user/${user}.json`, 'https://www.reddit.com/', true);
        const data = await response.json();
        const array: Post[] = [];
        console.log(data);
        console.log('Length: ', data.data.children);

        for (let post of data.data.children) {
            // t1 is comment.
            if (post.kind === 't1')
                continue;
            array.push(post.data as Post);
        }

        return array;
    }

    /**
     * Get's the about page of a subreddit
     */
    async getAbout(subreddit: string) {
        const response = await this.Get(`r/${subreddit}/about.json`);
        const data = await response.json();
        console.log(data);

        return data as SubredditAbout;
    }

    @requiresToken
    async savePost(id: string) {
        const response = await this.Post(`api/save`, { 'id': id });
        console.log(await response.json());
    }

    @requiresToken
    async unsavePost(id: string) {
        await this.Post(`api/unsave`, { 'id': id });
    }

    /**
     * Casts a vote on a reddit post
     * @param id The id of the post
     * @param vote Taken from reddit's API: indicates the direction of the vote. Voting 1 is an upvote, -1 is a downvote, and 0 is equivalent to "un-voting" by clicking again on a highlighted arrow
     */
    @requiresToken
    async votePost(id: string, vote: -1 | 0 | 1) {
        await this.Post(`api/vote`, { 'id': id, 'dir': vote.toString() });
    }

    async getComments(subreddit: string, id: string) {
        const response = await this.Get(`r/${subreddit}/comments/${id}.json`);
        const data = await response.json();
        const jsonComments = data[1].data.children;
        const comments: RedditComment[] = [];

        for (let i = 0; i < jsonComments.length; i++) {
            if (jsonComments[i].kind !== 't1') 
                continue;
            
            comments.push(jsonComments[i].data as RedditComment);
        }

        return comments;
        
    }
}
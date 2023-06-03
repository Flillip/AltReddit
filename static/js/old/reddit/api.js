import { randomString } from "./math.js";
import { NoToken } from "./errors.js";

const CLIENT_ID    = "9xk8vLeZJDsWbBSkfHuARw";
const REDIRECT_URI = "http://localhost:5000";
const API_ENDPOINT = "https://oauth.reddit.com/"
const REDDIT       = "https://reddit.com/";

function tokenCheck(target, key, descriptor) {
    console.log(`Wrapping method ${key}`);
    const originalMethod = descriptor.value;
    descriptor.value = function(...args) {
        console.log(`Running method ${key}`);
        if (localStorage.getItem('access_token') === null || new Date(localStorage.getItem('expiry_date')) < new Date(Date.now())) {
            console.log('asdasd')
            return Promise.reject(new NoToken('No token has been loaded'));
        }

        return originalMethod.apply(this, args);
    }

    return descriptor;
}

export default class RedditAPI {
    #access_token;
    #refresh_token;
    #expiry_date;

    constructor() {
        this.#access_token = localStorage.getItem('access_token');
        this.#refresh_token = localStorage.getItem('refresh_token');
        this.#expiry_date = new Date(localStorage.getItem('expiry_date'));

        // check if user is logged in
        // and token is still valid
        if (this.#access_token !== null) {
            if (this.#expiry_date < new Date(Date.now())) {
                console.log("Token expired. Refreshing");
                this.#refreshToken();
            } else {
                let checkDateInterval = setInterval(() => {
                    console.log("Refreshing token");
                    this.#refreshToken();
                    clearInterval(checkDateInterval);
                }, this.#expiry_date.getMilliseconds());
            }
        }

        this.getAboutMe = tokenCheck(this, 'getAboutMe', Object.getOwnPropertyDescriptor(RedditAPI.prototype, 'getAboutMe').value);
    }

    login() {
        const state = randomString(16);
        localStorage.setItem('state', state);
    
        window.open(
            `${REDDIT}api/v1/authorize.compact?client_id=${CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${REDIRECT_URI}&duration=permanent&scope=identity,mysubreddits,save`,
            "_self"
        );
    }

    getToken() {
        const has_error = parameters.has('error');
    
        if (has_error) {
            queue_error(`Error getting authorization: ${parameters.get('error')}`);
            return;
        }
        
        const code = parameters.get('code');
        
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
            this.#saveData(data, "Error getting token");
    
            window.location.replace('/');
        });
    }
    
    /**
     * Refreshes the token
     */
    #refreshToken() {
        const tokenEndpoint = 'https://www.reddit.com/api/v1/access_token';
        const body = new FormData();
      
        // fetch body
        body.append('grant_type', 'refresh_token');
        body.append('refresh_token', refresh_token);
        body.append('User-Agent', 'clone v1.0: u/bonnietogamer');
      
        fetch(tokenEndpoint, {
            method: 'POST',
            body: body,
            headers: {
                'Authorization': 'Basic ' + btoa(CLIENT_ID + ':')
            }
        }).then(response => response.json())
          .then(data => {
            this.#saveData(data, "Error refreshing token");
        });
    }
    
    #addMilliseconds (date, milliseconds) {
        date.setMilliseconds(date.getMilliseconds() + milliseconds);
        return date;
    }

    /**
     * Saves the token data returned from reddit.
     * @param {Object} data 
     */
    #saveData(data, error_msg) {
        if (data.error) {
            queue_error(`${error_msg}: ${data.error}`);
            return;
        }
        
        const access_token = data.access_token;
        const refresh_token = data.refresh_token;
        const expires_in = Number(data.expires_in);

        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('expiry_date', this.#addMilliseconds(new Date(Date.now()), expires_in));
    }

    #validateToken() {
        if (this.#access_token === null || this.#expiry_date < new Date(Date.now())) {
            return Promise.reject(new NoToken('No token has been loaded'));
        }
    }

    #returnData(response) {
        return response.json().then((data) => {
            return data;
        }).catch((err) => {
            return { "error": err };
        });
    }

    /**
     * Returns the identity of the user.
     */
    getAboutMe() {
        // this.#validateToken();

        return fetch(API_ENDPOINT + `/api/v1/me`, {
            method: 'GET',
            headers: {
                'Authorization': `bearer ${this.#access_token}`
            }
        }).then(this.#returnData);
    }
}
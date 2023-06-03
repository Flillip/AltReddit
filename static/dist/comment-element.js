const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="./static/css/post.css">

<div class="comment">
    <div class="comment-content">
        <div class="row-1">
            <div class="arrow" id="upvote"> <img width="100%" src="./static/svg/upvote.svg" alt="upvote"> </div>
            <div class="arrow" id="downvote"> <img width="100%" src="./static/svg/upvote.svg" alt="downvote"> </div>
        </div>
        <div class="row-2">
            <div class="user">
                <img class="pfp" src="./static/img/subreddit_default.png" alt="subreddit logo">
                <a href="user1">user1</a>
            </div>
            <p class="comment-text">this is a test</p>
        </div>
    </div>

    <div class="separator hidden">
        <button class="collapse-line"></button>
    </div>
</div>
`;
export class CommentElement extends HTMLElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.append(template.content.cloneNode(true));
    }
    set userPfp(value) {
    }
    set username(value) {
    }
    set commentText(value) {
    }
    static get observedAttributes() { return ['user-pfp', 'username', 'comment-text']; }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'user-pfp') {
            this.userPfp = newValue;
        }
        else if (name === 'username') {
            this.username = newValue;
        }
        else if (name === 'comment-text') {
            this.commentText = newValue;
        }
    }
}

import { fixHtml } from "./post-element.js";

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
                <img class="pfp" id="pfp" src="./static/img/subreddit_default.png" alt="user pfp">
                <a href="user" id="username">user</a>
            </div>
            <p class="comment-text" id="text">this is a test</p>
        </div>
    </div>

    <div class="separator hidden" id="children">
        <button class="collapse-line"></button>
        <slot name="comment" class="comments"></slot>

    </div>
</div>
`

export class CommentElement extends HTMLElement {
    constructor() {
        super();

        const shadow = this.attachShadow({ mode: 'open' });
        shadow.append(template.content.cloneNode(true));

        const slotEvent = (e: Event) => {
            const children = shadow.getElementById('children') as HTMLElement;
            children.classList.remove('hidden');
            shadow.removeEventListener('slotchange', slotEvent);
        }

        shadow.addEventListener('slotchange', slotEvent);
    }

    set userPfp(value: string) {
        const pfp = this.shadowRoot?.getElementById('pfp') as HTMLImageElement;
        pfp.src = value;
    }

    set username(value: string) {
        const username = this.shadowRoot?.getElementById('username') as HTMLAnchorElement;
        username.href = '?link=' + value;
        username.innerText = value;
    }

    set commentText(value: string) {
        const text = this.shadowRoot?.getElementById('text') as HTMLParagraphElement;
        text.innerHTML = fixHtml(value);
    }

    set maxWidth(value: string) {
        const text = this.shadowRoot?.querySelector<HTMLElement>('.comment-text') as HTMLElement;
        text.style.width = value;
        
        const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name=comment]') as HTMLSlotElement;
        const comments = slot.assignedElements();
        comments.forEach(comment => {
            comment.setAttribute('width', value);
        });
    }

    static get observedAttributes() { return ['user-pfp', 'username', 'comment-text', 'max-width']; }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === 'user-pfp') {
            this.userPfp = newValue;
        } else if (name === 'username') {
            this.username = newValue;
        } else if (name === 'comment-text') {
            this.commentText = newValue
        } else if (name === 'max-width') {
            this.maxWidth = newValue;
        }
    }    
}

customElements.define('comment-element', CommentElement);

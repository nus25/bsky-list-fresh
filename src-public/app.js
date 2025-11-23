// Translations
const translations = {
	en: {
		pageTitle: 'Bsky List Fresh',
		pageDescription: 'Check the last addition date of Bluesky lists',
		submitText: '🔍 Check',
		submitTextLoading: 'Checking...',
		labelCreator: 'Creator',
		labelPurpose: 'Type',
		labelDescription: 'Description',
		labelItemCount: 'Items',
		labelLastUpdated: 'Last Updated',
		purposeList: 'List',
		purposeModList: 'Moderation List',
		errorInvalidUri: 'The provided input does not seem to be a valid list',
		errorGeneric: 'An error occurred. Please try again later.',
		errorListNotFound: 'List not found. Please check the URL.',
		noItems: 'This list has no items',
		noDescription: 'No description',
		labelAcceptTos: 'I accept the',
		tosLinkText: 'Terms of Service',
		helpTitle: 'How to use',
		helpBody: `
            <p><strong>What does this tool do?</strong></p>
            <p>This tool checks when the most recent user was added to a Bluesky list.</p>
            
            <p><strong>How to use:</strong></p>
            <ol>
                <li>Go to Bluesky and find the list you want to check</li>
                <li>Copy the list URL:
                    <ul>
	                    <li>Use the "Copy link to list" in "..." menu of Bluesky client</li>
                        <li>Or copy from your browser's address bar (e.g., <code>https://bsky.app/profile/nus.bsky.social/lists/3khbcfekugt2j</code>)</li>
                    </ul>
                </li>
                <li>Paste it into the input field and select "Check" to see the last addition date</li>
            </ol>
            
            <p><strong>Alternative:</strong> You can also use the list's AT URI directly (e.g., <code>at://did:plc:v2tssqq5tlnx4f5qvtpnlw5j/app.bsky.graph.list/3khbcfekugt2j</code>)</p>
			<p><strong>Note:</strong> The date is based on the latest record present in the list.</p>
			`
	},
	ja: {
		pageTitle: 'Bsky List Fresh',
		pageDescription: 'Blueskyリストの最終追加日を確認します',
		submitText: '🔍 確認',
		submitTextLoading: '確認中...',
		labelCreator: '作成者',
		labelPurpose: '種類',
		labelDescription: '説明',
		labelItemCount: 'アイテム数',
		labelLastUpdated: '最終追加日',
		purposeList: 'リスト',
		purposeModList: 'モデレーションリスト',
		errorInvalidUri: '有効なリストではないようです',
		errorGeneric: '問題が発生しました。しばらく経ってからおためしください。',
		errorListNotFound: 'リストが見つかりませんでした。URLを確認してください。',
		noItems: 'このリストにはアイテムがありません',
		noDescription: '説明なし',
		labelAcceptTos: 'に同意します',
		tosLinkText: '利用規約',
		helpTitle: '使い方',
		helpBody: `
            <p><strong>このツールは何をするの？</strong></p>
            <p>Blueskyのリストに最後にユーザーが追加された日時を確認できます。</p>
            
            <p><strong>使い方：</strong></p>
            <ol>
                <li>Blueskyで確認したいリストを開きます</li>
                <li>リストのURLをコピーします：
                    <ul>
                        <li>Blueskyクライアントの「...」メニューから「リストへのリンクをコピー」を選択</li>
                        <li>またはブラウザのアドレスバーからコピー（例：<code>https://bsky.app/profile/nus.bsky.social/lists/3khbcfekugt2j</code>）</li>
                    </ul>
                </li>
                <li>入力欄にペーストして「確認」ボタンを選択すると、最終追加日が表示されます</li>
            </ol>
            
            <p><strong>別の方法：</strong> リストのAT URI（例：<code>at://did:plc:v2tssqq5tlnx4f5qvtpnlw5j/app.bsky.graph.list/3khbcfekugt2j</code>）を直接入力することもできます</p>
			<p><strong>補足：</strong> 日時はリストに存在する最新のレコードの情報を基に取得されます。</p>
			`
	}
};
const atUriPattern = /^at:\/\/([a-zA-Z0-9._-]+(?:\.[a-zA-Z]{2,})?|did:[a-z0-9:%-]+)\/app\.bsky\.graph\.list\/[a-zA-Z0-9]+$/;
// Language management
let currentLang = 'en';

function detectLanguage() {
	const saved = sessionStorage.getItem('language');
	if (saved) {
		return saved;
	}

	const browserLang = navigator.language || navigator.userLanguage;
	return browserLang.startsWith('ja') ? 'ja' : 'en';
}

function setLanguage(lang) {
	currentLang = lang;
	sessionStorage.setItem('language', lang);
	document.documentElement.lang = lang;

	const t = translations[lang];

	// Update static text
	document.getElementById('page-title').textContent = t.pageTitle;
	document.getElementById('page-description').textContent = t.pageDescription;
	document.getElementById('submit-text').textContent = t.submitText;
	document.getElementById('label-creator').textContent = t.labelCreator;
	document.getElementById('label-purpose').textContent = t.labelPurpose;
	document.getElementById('label-description').textContent = t.labelDescription;
	document.getElementById('label-item-count').textContent = t.labelItemCount;
	document.getElementById('label-last-updated').textContent = t.labelLastUpdated;
	document.getElementById('help-title').textContent = t.helpTitle;
	document.getElementById('help-body').innerHTML = t.helpBody;

	// tos-labelはリンクを含むのでinnerHTMLを使用
	const tosLabel = document.getElementById('tos-label');
	if (tosLabel) {
		const tosLink = `<a href="#" id="tos-link">${t.tosLinkText}</a>`;
		tosLabel.innerHTML = lang === 'ja'
			? `${tosLink}${t.labelAcceptTos}`
			: `${t.labelAcceptTos} ${tosLink}`;
		
	}

	// Update aria-current for language switcher
	const languageOptions = document.getElementById('language-options');
	if (languageOptions) {
		const allLinks = languageOptions.querySelectorAll('a');
		allLinks.forEach(link => {
			link.removeAttribute('aria-current');
			const linkLang = link.textContent.trim();
			if ((lang === 'ja' && linkLang === '日本語') || (lang === 'en' && linkLang === 'English')) {
				link.setAttribute('aria-current', 'page');
			}
		});
	}
}

function translate(key) {
	return translations[currentLang][key] || key;
}

// initialize TOS checkbox and submit button
const acceptTosCheckbox = document.getElementById('accept-tos');
const submitButton = document.getElementById('submit-button');

if (acceptTosCheckbox && submitButton) {
	// 初期状態：チェックされていない場合はボタンを無効化
	submitButton.disabled = !acceptTosCheckbox.checked;

	// チェックボックスの状態が変わったときにボタンの状態を更新
	acceptTosCheckbox.addEventListener('change', (e) => {
		submitButton.disabled = !e.target.checked;
	});
}

// Initialize language
currentLang = detectLanguage();
setLanguage(currentLang);

// Language switcher event
const languageOptions = document.getElementById('language-options');
const languageSwitcher = document.querySelector('.language-switcher');

if (languageOptions) {
	languageOptions.addEventListener('click', (e) => {
		if (e.target.tagName === 'A') {
			e.preventDefault();
			const selectedLang = e.target.textContent.trim();

			// 言語の判定
			const newLang = selectedLang === '日本語' ? 'ja' : 'en';
			setLanguage(newLang);

			// detailsを閉じる
			if (languageSwitcher) {
				languageSwitcher.removeAttribute('open');
			}
		}
	});
}

// Convert Bluesky list URL to AT URI
function convertBskyUrlToAtUri(input) {
	// Check if it's already an AT URI
	if (atUriPattern.test(input)) {
		return input;
	}

	// Try to parse as Bluesky URL
	// Format: https://bsky.app/profile/{did or handle}/lists/{rkey}
	const urlPattern = /^https:\/\/bsky\.app\/profile\/([a-zA-Z0-9._-]+(?:\.[a-zA-Z]{2,})?|did:[a-z0-9:%-]+)\/lists\/([a-zA-Z0-9]+)$/;
	const match = input.match(urlPattern);

	if (match) {
		const identifier = match[1]; // Could be DID or handle
		const rkey = match[2];
		return `at://${identifier}/app.bsky.graph.list/${rkey}`;
	}

	return null;
}

// AT URI validation
function validateAtUri(uri) {
	// Accept both AT URIs and handle: format
	return atUriPattern.test(uri);
}

// Format date to YYYY/MM/DD in local time
function formatDate(isoString) {
	return new Intl.DateTimeFormat(navigator.language, {
		dateStyle: "medium",
	}).format(new Date(isoString));
}

// Show toast notification
function showToast(message) {
	const toast = document.getElementById('toast');
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => {
		toast.classList.remove('show');
	}, 2000);
}

// Show error message
function showError(message) {
	const errorDiv = document.getElementById('error-message');
	errorDiv.textContent = message;
	errorDiv.style.display = 'block';
	errorDiv.style.color = 'var(--pico-del-color)';
}

// Hide error message
function hideError() {
	document.getElementById('error-message').style.display = 'none';
}

// Display result
function displayResult(data) {
	// List name with link
	const listLink = `https://bsky.app/profile/${data.creatorHandle}/lists/${data.rkey}`;
	document.getElementById('result-list-name').innerHTML =
		`<a href="${listLink}" target="_blank" rel="noopener noreferrer">${data.name || 'Untitled List'}</a>`;

	// Creator with link
	const creatorLink = `https://bsky.app/profile/${data.creatorHandle}`;
	document.getElementById('result-creator').innerHTML =
		`<a href="${creatorLink}" target="_blank" rel="noopener noreferrer">@${data.creatorHandle}</a>`;

	// Purpose
	let purposeText = data.purpose;
	if (data.purpose.includes('curatelist')) {
		purposeText = translate('purposeList');
	} else if (data.purpose.includes('modlist')) {
		purposeText = translate('purposeModList');
	}
	document.getElementById('result-purpose').textContent = purposeText;

	// Description
	const descSection = document.getElementById('description-section');
	if (data.description) {
		document.getElementById('result-description').textContent = data.description;
		descSection.style.display = 'flex';
	} else {
		document.getElementById('result-description').textContent = translate('noDescription');
		descSection.style.display = 'flex';
	}

	// Item count
	document.getElementById('result-item-count').textContent = data.listItemCount;

	// Last updated
	if (data.dateLastAdded) {
		document.getElementById('result-last-updated').textContent = formatDate(data.dateLastAdded);
	} else {
		document.getElementById('result-last-updated').textContent = translate('noItems');
	}

	// Show result card
	document.getElementById('result-card').style.display = 'block';
	document.getElementById('result-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Handle form submission
document.getElementById('list-form').addEventListener('submit', async (e) => {
	e.preventDefault();

	hideError();

	const uriInput = document.getElementById('list-uri');
	const input = uriInput.value.trim();

	// Convert Bluesky URL to AT URI if needed
	const uri = convertBskyUrlToAtUri(input);
	console.log('Converted URI:', uri);
	// Validate AT URI
	if (!uri || !validateAtUri(uri)) {
		showError(translate('errorInvalidUri'));
		return;
	}

	// Disable form during submission
	const submitButton = document.getElementById('submit-button');
	const submitText = document.getElementById('submit-text');
	submitButton.disabled = true;
	uriInput.disabled = true;
	submitText.textContent = translate('submitTextLoading');
	const loadingIndicator = document.getElementById('loading-indicator');

	// hide result card
	document.getElementById('result-card').style.display = 'none';
	// Show loading indicator
    loadingIndicator.style.display = 'block';
	
	try {
		const response = await fetch('/api/list-info', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ uri })
		});

		if (!response.ok) {

			const errorData = await response.json();
			// Show specific error messages
			if (errorData.message === 'LIST_NOT_FOUND') {
				showError(translate('errorListNotFound'));
			} else {
				showError(translate('errorGeneric'));
			}
			return;
		}

		const data = await response.json();
		displayResult(data);

	} catch (error) {
		console.error('Error:', error);
		showError(translate('errorGeneric'));
	} finally {
		// Re-enable form
		submitButton.disabled = false;
		uriInput.disabled = false;
		submitText.textContent = translate('submitText');

		// Hide loading indicator
        loadingIndicator.style.display = 'none';
	}
});

// Check for URI parameter on load
window.addEventListener('DOMContentLoaded', () => {
	const urlParams = new URLSearchParams(window.location.search);
	const uriParam = urlParams.get('uri');

	if (uriParam) {
		const uriInput = document.getElementById('list-uri');

		// Convert Bluesky URL to AT URI if needed
		const uri = convertBskyUrlToAtUri(uriParam);

		if (uri && validateAtUri(uri)) {
			uriInput.value = uri;
			document.getElementById('list-form').dispatchEvent(new Event('submit'));
		} else {
			// Show the invalid URI in the input field for user correction
			uriInput.value = uriParam;
			showError(translate('errorInvalidUri'));
		}
	}
});

// Terms of Service modal functionality
async function openTosModal() {
	const modal = document.getElementById('tos-modal');
	const tosBody = document.getElementById('tos-body');
	
	// Determine which terms file to load based on current language
	const termsFile = currentLang === 'ja' ? '/terms-ja.html' : '/terms-en.html';
	
	try {
		const response = await fetch(termsFile);
		if (!response.ok) {
			throw new Error('Failed to load terms');
		}
		
		const html = await response.text();
		
		// Parse HTML and extract content from .container
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		const container = doc.querySelector('.container');
		
		if (container) {
			tosBody.innerHTML = container.innerHTML;
			modal.classList.add('show');
		}
	} catch (error) {
		console.error('Error loading terms:', error);
	}
}

document.addEventListener('click', (e) => {
	if (e.target.id === 'tos-link') {
		e.preventDefault();
		openTosModal();
	}
});

// ToS modal close handlers
document.getElementById('tos-close').addEventListener('click', () => {
	document.getElementById('tos-modal').classList.remove('show');
});

document.getElementById('tos-modal').addEventListener('click', (e) => {
	if (e.target.id === 'tos-modal') {
		document.getElementById('tos-modal').classList.remove('show');
	}
});

// Help modal functionality
document.getElementById('help-icon').addEventListener('click', () => {
	const modal = document.getElementById('help-modal');
	document.getElementById('help-title').textContent = translate('helpTitle');
	document.getElementById('help-body').innerHTML = translate('helpBody');
	modal.classList.add('show');
});

document.getElementById('help-close').addEventListener('click', () => {
	document.getElementById('help-modal').classList.remove('show');
});

document.getElementById('help-modal').addEventListener('click', (e) => {
	if (e.target.id === 'help-modal') {
		document.getElementById('help-modal').classList.remove('show');
	}
});

// ESC key to close modals
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') {
		document.getElementById('help-modal').classList.remove('show');
		document.getElementById('tos-modal').classList.remove('show');
	}
});

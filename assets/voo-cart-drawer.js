var Shopify = Shopify || {};

Shopify.money_format = "${{amount}}";
Shopify.formatMoney = function (cents, format) {
  if (typeof cents == "string") {
    cents = cents.replace(".", "");
  }

  var value = "";
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || this.money_format;

  function defaultOption(opt, def) {
    return typeof opt == "undefined" ? def : opt;
  }

  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ",");
    decimal = defaultOption(decimal, ".");

    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    const parts = number.split("."),
      dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + thousands),
      cents = parts[1] ? decimal + parts[1] : "";

    return dollars + cents;
  }

  switch (formatString.match(placeholderRegex)[1]) {
    case "amount":
      value = formatWithDelimiters(cents, 2);
      break;
    case "amount_no_decimals":
      value = formatWithDelimiters(cents, 0);
      break;
    case "amount_with_comma_separator":
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
  }

  return formatString.replace(placeholderRegex, value);
};

function setupEventInterceptor(elements, eventType, callback) {
  function eventInterceptor(event) {
    const targetElement = event.target.closest(elements.join(", "));

    if (targetElement) {
      event.preventDefault();

      if (typeof callback === "function") {
        callback(targetElement);
      } else {
        console.error("Callback is not a function!");
      }

      event.stopImmediatePropagation();
    }
  }

  document.body.addEventListener(eventType, eventInterceptor, {
    capture: true,
  });
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

// api
function getFetchPostConfig(body, type = "json") {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: `application/${type}`,
    },
    body,
  };
}

async function getCart() {
  try {
    const res = await fetch(`${routes.cart_url}.json`);

    if (!res.ok) {
      throw new Error("HTTP error: ", res.status);
    }

    return await res.json();
  } catch (error) {
    console.error(error.message);
  }
}

class VooCart {
  constructor() {
    this.renderCartDrawer();
  }

  getEmptyInnerContentMarkup() {
    const { continueLink = "/collections/all" } = VOOCART.config.settings;
    return `<div class="voo-cart-drawer__inner--empty">
        <h2 class="voo-cart-drawer__inner--empty-title">${"Your cart is empty"}</h2>
        <a class="voo-cart-drawer__inner--empty-continue voo-link" href="${continueLink}">Continue shopping</a>
      </div>`;
  }

  renderCartDrawer() {
    const { cartType, heading } = VOOCART.config.settings;
    const cartDrawerBasicMarkup = `
    <voo-cart-drawer class="${
      cartType === "drawer" ? "voo-drawer" : "voo-modal"
    }">
      <div class="voo-cart-drawer">
        <div class="voo-cart-drawer__overlay"></div>
        <div
          class="voo-cart-drawer__inner"
          role="dialog"
          aria-modal="true"
          aria-label="Cart"
          tabindex="-1"
        >

          ${this.getEmptyInnerContentMarkup()}

          <div class="voo-cart-drawer__inner-content">
            <div class="voo-cart-drawer__header">
              <h2 class="voo-cart-drawer__heading">${
                heading ? heading : "Cart"
              }</h2>
              <button
                class="voo-cart-drawer__close voo-btn"
                type="button"
                data-voocart-close
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                  role="presentation"
                  class="icon icon-close"
                  fill="none"
                  viewBox="0 0 18 17"
                  width="18"
                  height="18"
                >
                  <path d="M.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z" fill="currentColor">
                </svg>
              </button>
            </div>
            <div class="voo-cart-drawer__body"></div>
            <div class="voo-cart-drawer__footer">
              <div class="voo-cart-drawer__totals">
                <h2 class="voo-cart-drawer__totals-title">Subtotal</h2>
                <p class="voo-cart-drawer__totals-value">$000.00</p>
              </div>
              <div>
                <button
                  type="submit"
                  class="voo-cart-drawer__cta-checkout voo-btn"
                  name="checkout"
                >
                  Checkout
                </button>
                <button class="voo-cart-drawer__cta-continue voo-btn" data-voocart-close>or continue shopping</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </voo-cart-drawer>
    `;

    document.body.insertAdjacentHTML("afterbegin", cartDrawerBasicMarkup);
  }
}

class VooCartDrawer extends HTMLElement {
  constructor() {
    super();

    this.init();
    this.renderCartDrawerBodyContent();
  }

  renderCartDrawerBodyContent() {
    const blockOrder = VOOCART.config.blockOrder;

    const cartDarwerBodyContentMarkup = blockOrder.reduce(
      (markup, blockType) => {
        switch (blockType) {
          case "announcement_bar":
            return markup + this.getAnnouncementBarMarkup();
          case "free-gift":
            return markup + this.getFreeGiftBlockMarkup();
          case "cart_items":
            return markup + this.getCartDrawerItemsMarkup();
          case "bogo":
            return markup + this.getBogoBlockMarkup();
          case "recommendations":
            return markup + this.getRecommendationsBlockMarkup();
          case "cart-drawer-note":
            return markup + this.getCartDrawerNoteMarkup();
          case "reward-bar":
            return markup + this.getRewardBarMarkup();
          case "discount_applicator":
            return markup + this.getDiscountBlockMarkup();
          default:
            return markup;
        }
      },
      ""
    );

    this.checkIfCartIsEmpty();
    document.querySelector(".voo-cart-drawer__body").innerHTML =
      cartDarwerBodyContentMarkup;
  }

  addOpenCartListeners() {
    document
      .querySelectorAll('[href$="/cart"], [data-voocart-open]')
      .forEach((e) => {
        e.addEventListener("click", (e) => {
          e.preventDefault();
          this.open();
        });
      });
  }

  addCloseCartListeners() {
    document.querySelectorAll("[data-voocart-close]").forEach((e) => {
      e.addEventListener("click", (e) => {
        e.preventDefault();
        this.close();
      });
    });
  }

  interceptProductSubmit() {
    const formsToInterceptSubmit = ['form[action^="/cart/add"]'];
    const customSubmitHandler = async (form) => {
      const variantId = form.querySelector('input[name="id"]')?.value;
      const quantity = document.querySelector('input[name="quantity"]')?.value;

      await this.addProduct(variantId, quantity);
    };

    setupEventInterceptor(
      formsToInterceptSubmit,
      "submit",
      customSubmitHandler
    );
  }

  addOverlayEventListeners() {
    const overlayEl = this.querySelector(".voo-cart-drawer__overlay");
    document.addEventListener(
      "keyup",
      (e) => e.code === "Escape" && this.close()
    );

    if (overlayEl) overlayEl.addEventListener("click", this.close.bind(this));
  }

  open() {
    setTimeout(() => {
      this.classList.add("animate", "open");
    });

    document.body.classList.add("overflow-hidden");
  }

  close() {
    this.classList.remove("open");
    document.body.classList.remove("overflow-hidden");
  }

  async renderDynamicContent() {
    await this.updateStickyBubble();
    await this.checkIfCartIsEmpty();
    await this.renderCartDrawerItems();
    await this.renderCartDrawerFooter();

    const rewardBarEl = document.querySelector("voo-cart-drawer-reward-bar");
    const freeGiftEl = document.querySelector("voo-cart-drawer-free-gift");
    const bogoEl = document.querySelector("voo-cart-drawer-bogo");
    const recommendationsEl = document.querySelector(
      "voo-cart-drawer-recommendations"
    );

    if (rewardBarEl) rewardBarEl.updateRewardBar();
    if (freeGiftEl) freeGiftEl.updateFreeGiftMessage();
    if (bogoEl) bogoEl.productVariantsToCheckInCartForGift();
    if (recommendationsEl) recommendationsEl.renderRecommendations();
  }

  init() {
    const { showStickyCart } = VOOCART.config.settings;

    if (showStickyCart) {
      this.renderStickyCart();
      this.updateStickyBubble();
    }

    this.addOpenCartListeners();
    this.addOverlayEventListeners();
    this.interceptProductSubmit();
    this.updateCartDrawerFooterMarkup();
    this.addCloseCartListeners();
  }

  async addProduct(variantId, quantity = 1) {
    const body = JSON.stringify({
      items: [
        {
          id: variantId,
          quantity,
        },
      ],
    });

    await fetch(`${routes.cart_add_url}`, getFetchPostConfig(body));

    await this.renderDynamicContent();
    this.open();
  }

  getCartDrawerNoteMarkup() {
    const isCollapsible =
      VOOCART.config.blocks.cartDrawerNote.settings.isCollapsible;

    return `
      <voo-cart-note>
        <div class="voo-cart-drawer__note-wrap">
          ${
            isCollapsible
              ? `<button type="button" class="voo-cart-drawer__note-trigger voo-btn">Write a note</button>`
              : ""
          }
          <textarea
            id="voo-cart-drawer-note"
            class="voo-cart-drawer__note-textarea ${
              isCollapsible ? "voo-hidden" : ""
            }"
            placeholder="${"Enter special instructions for seller"}"
          >${""}</textarea>
        </div>
      </voo-cart-note>
    `;
  }

  getAnnouncementBarMarkup() {
    const { announcementAutoplay, announcementMessages } =
      VOOCART.config.blocks.announcementBar.settings;

    return `<voo-cart-drawer-announcement class="voo-cart-drawer__announcement-bar" ${
      announcementAutoplay ? 'data-autoplay="true"' : ""
    }>
      <ul class="siema voo-cart-drawer__announcement-list voo-list">${announcementMessages.reduce(
        (markup, message) =>
          markup +
          `<li class="voo-cart-drawer__announcement-item">${message}</li>`,
        ""
      )}</ul>

      <button class="voo-btn voo-cart-drawer__announcement-btn prev">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.07005 12.543L16.4296 20.508C16.569 20.641 16.7543 20.7151 16.9471 20.7151C17.1398 20.7151 17.3251 20.641 17.4646 20.508L17.4736 20.499C17.5414 20.4345 17.5954 20.357 17.6324 20.271C17.6693 20.185 17.6883 20.0923 17.6883 19.9988C17.6883 19.9052 17.6693 19.8126 17.6324 19.7266C17.5954 19.6406 17.5414 19.563 17.4736 19.4985L9.60155 11.9985L17.4736 4.50151C17.5414 4.43705 17.5954 4.35946 17.6324 4.27346C17.6693 4.18746 17.6883 4.09485 17.6883 4.00126C17.6883 3.90767 17.6693 3.81506 17.6324 3.72906C17.5954 3.64306 17.5414 3.56547 17.4736 3.50101L17.4646 3.49201C17.3251 3.35904 17.1398 3.28486 16.9471 3.28486C16.7543 3.28486 16.569 3.35904 16.4296 3.49201L8.07005 11.457C7.99653 11.5271 7.93801 11.6113 7.89801 11.7046C7.85802 11.798 7.8374 11.8985 7.8374 12C7.8374 12.1016 7.85802 12.202 7.89801 12.2954C7.93801 12.3887 7.99653 12.473 8.07005 12.543Z" fill="currentColor"/>
        </svg>
      </button>
      <button class="voo-btn voo-cart-drawer__announcement-btn next">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.9304 11.457L7.57094 3.49199C7.43145 3.35903 7.24614 3.28485 7.05344 3.28485C6.86073 3.28485 6.67542 3.35903 6.53594 3.49199L6.52694 3.50099C6.45908 3.56545 6.40505 3.64304 6.36813 3.72904C6.33121 3.81504 6.31217 3.90765 6.31217 4.00124C6.31217 4.09483 6.33121 4.18745 6.36813 4.27344C6.40505 4.35944 6.45908 4.43703 6.52694 4.50149L14.3989 12.0015L6.52694 19.4985C6.45908 19.563 6.40505 19.6405 6.36813 19.7265C6.33121 19.8125 6.31217 19.9052 6.31217 19.9987C6.31217 20.0923 6.33121 20.1849 6.36813 20.2709C6.40505 20.3569 6.45908 20.4345 6.52694 20.499L6.53594 20.508C6.67542 20.641 6.86073 20.7151 7.05344 20.7151C7.24614 20.7151 7.43145 20.641 7.57094 20.508L15.9304 12.543C16.004 12.4729 16.0625 12.3887 16.1025 12.2954C16.1425 12.202 16.1631 12.1015 16.1631 12C16.1631 11.8984 16.1425 11.798 16.1025 11.7046C16.0625 11.6113 16.004 11.527 15.9304 11.457Z" fill="currentColor"/>
        </svg>
      </button>
    </voo-cart-drawer-announcement>
    `;
  }

  getRecommendationsBlockMarkup() {
    const { heading, navMode } = VOOCART.config.blocks.recommendations.settings;

    return `<voo-cart-drawer-recommendations>
        <h3 class="voo-cart-drawer__recommendations-title voo-cart-drawer__block-title">${heading}</h3>
        <div class="voo-cart-drawer__recommendations-list-wrapper">
          <ul class="voo-cart-drawer__recommendations-list voo-list"></ul>
          ${
            navMode === "slider"
              ? `<button class="voo-btn voo-cart-drawer__recommendations-controls-btn prev">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.07005 12.543L16.4296 20.508C16.569 20.641 16.7543 20.7151 16.9471 20.7151C17.1398 20.7151 17.3251 20.641 17.4646 20.508L17.4736 20.499C17.5414 20.4345 17.5954 20.357 17.6324 20.271C17.6693 20.185 17.6883 20.0923 17.6883 19.9988C17.6883 19.9052 17.6693 19.8126 17.6324 19.7266C17.5954 19.6406 17.5414 19.563 17.4736 19.4985L9.60155 11.9985L17.4736 4.50151C17.5414 4.43705 17.5954 4.35946 17.6324 4.27346C17.6693 4.18746 17.6883 4.09485 17.6883 4.00126C17.6883 3.90767 17.6693 3.81506 17.6324 3.72906C17.5954 3.64306 17.5414 3.56547 17.4736 3.50101L17.4646 3.49201C17.3251 3.35904 17.1398 3.28486 16.9471 3.28486C16.7543 3.28486 16.569 3.35904 16.4296 3.49201L8.07005 11.457C7.99653 11.5271 7.93801 11.6113 7.89801 11.7046C7.85802 11.798 7.8374 11.8985 7.8374 12C7.8374 12.1016 7.85802 12.202 7.89801 12.2954C7.93801 12.3887 7.99653 12.473 8.07005 12.543Z" fill="currentColor"/>
            </svg>
          </button>
          <button class="voo-btn voo-cart-drawer__recommendations-controls-btn next">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.9304 11.457L7.57094 3.49199C7.43145 3.35903 7.24614 3.28485 7.05344 3.28485C6.86073 3.28485 6.67542 3.35903 6.53594 3.49199L6.52694 3.50099C6.45908 3.56545 6.40505 3.64304 6.36813 3.72904C6.33121 3.81504 6.31217 3.90765 6.31217 4.00124C6.31217 4.09483 6.33121 4.18745 6.36813 4.27344C6.40505 4.35944 6.45908 4.43703 6.52694 4.50149L14.3989 12.0015L6.52694 19.4985C6.45908 19.563 6.40505 19.6405 6.36813 19.7265C6.33121 19.8125 6.31217 19.9052 6.31217 19.9987C6.31217 20.0923 6.33121 20.1849 6.36813 20.2709C6.40505 20.3569 6.45908 20.4345 6.52694 20.499L6.53594 20.508C6.67542 20.641 6.86073 20.7151 7.05344 20.7151C7.24614 20.7151 7.43145 20.641 7.57094 20.508L15.9304 12.543C16.004 12.4729 16.0625 12.3887 16.1025 12.2954C16.1425 12.202 16.1631 12.1015 16.1631 12C16.1631 11.8984 16.1425 11.798 16.1025 11.7046C16.0625 11.6113 16.004 11.527 15.9304 11.457Z" fill="currentColor"/>
            </svg>
          </button>`
              : ""
          }
        </div>
      </voo-cart-drawer-recommendations>`;
  }

  getDiscountBlockMarkup() {
    return `<voo-cart-drawer-discount id="CartDrawerDiscount">
      <div class="cart-sidebar-discount">
        <div class="discount-code-wrap">
          <div class="discount-code-input-wrap">
            <input type="text" id="discount-code-input" autocomplete="on" value="" placeholder="Discount code">
            <button id="apply-discount-btn">Apply</button>
          </div>
          <small id="discount-code-error"></small>
        </div>
      </div>
    </voo-cart-drawer-discount>`;
  }

  getBogoBlockMarkup() {
    return `
      <voo-cart-drawer-bogo>
        <h3 class="voo-cart-drawer__bogo-title voo-cart-drawer__block-title">Pick your gift</h3>
        <ul class="voo-cart-drawer__bogo-list voo-list"></ul>
      </voo-cart-drawer-bogo>
    `;
  }

  getRewardBarMarkup() {
    return `
      <voo-cart-drawer-reward-bar>
        <div class="voo-cart-drawer__reward-bar-wrap">
          <div class="voo-cart-drawer__reward-bar-message-wrap">
            <div class="voo-cart-drawer__reward-bar-message">
              <p class="voo-cart-drawer__reward-bar-message-applied voo-hidden"></p>
              <p class="voo-cart-drawer__reward-bar-message-spend">Spend <span class="money-to-spend money"></p>
            </div>
          </div>
          <div class="voo-cart-drawer__reward-bar-line-wrap">
            <span class="voo-cart-drawer__reward-bar-line"></span>
          </div>
        </div>
      </voo-cart-drawer-reward-bar>
    `;
  }

  async getProductVariantData(variantId) {
    try {
      const res = await fetch(`/variants/${variantId}.js`);
      if (!res.ok) {
        throw new Error("HTTP error: ", res.status);
      }

      return await res.json();
    } catch (error) {
      console.error(error.message);
    }
  }

  getFreeGiftBlockMarkup() {
    return `
      <voo-cart-drawer-free-gift>
        <div class="voo-cart-drawer__gift-message-wrapper">
          <div class="voo-cart-drawer__gift-img-wrapper">
            <img class="voo-cart-drawer__gift-img" src="" alt="" width="50" height="50">
            <span class="voo-cart-drawer__gift-label">FREE</span>
          </div>
          <p class="voo-cart-drawer__gift-message">
            Continue shopping on
            <span class="voo-cart-drawer__gift-total-left money"></span> 
            and
            <span class="voo-cart-drawer__gift-message--accent"> get 
              <span class="voo-cart-drawer__gift-name"></span> 
              as a gift!
            </span>
            </p>
        </div> 
      </voo-cart-drawer-free-gift>
    `;
  }

  renderStickyCart() {
    const {
      stickyCartVerticalAlign = "center",
      stickyCartHorizontalAlign = "right",
    } = VOOCART.config.settings;

    const stickyCartBtnMarkup = `
    <style>
      ${
        stickyCartVerticalAlign === "center"
          ? `
        .voo-cart-drawer__sticky-btn {
          bottom: 50%;
          ${
            stickyCartHorizontalAlign === "right"
              ? "right: 24px;"
              : "left: 24px;"
          }
          transform: translateY(50%);
        }
        
        .voo-cart-drawer__sticky-btn:hover {
          transform: translateY(50%) scale(1.05);
        }`
          : `
        .voo-cart-drawer__sticky-btn {
          bottom: 24px;
          ${
            stickyCartHorizontalAlign === "right"
              ? "right: 24px;"
              : "left: 24px;"
          }
        }
        
        .voo-cart-drawer__sticky-btn:hover {
          transform: scale(1.05);
        }`
      }
    </style>

    <button type="button" class="voo-cart-drawer__sticky-btn voo-btn">
      <svg
        fill="currentColor"
        width="24"
        height="24"
        viewBox="0 0 902.86 902.86"
      >
        <g>
          <g>
            <path d="M671.504,577.829l110.485-432.609H902.86v-68H729.174L703.128,179.2L0,178.697l74.753,399.129h596.751V577.829z
              M685.766,247.188l-67.077,262.64H131.199L81.928,246.756L685.766,247.188z"/>
            <path d="M578.418,825.641c59.961,0,108.743-48.783,108.743-108.744s-48.782-108.742-108.743-108.742H168.717
              c-59.961,0-108.744,48.781-108.744,108.742s48.782,108.744,108.744,108.744c59.962,0,108.743-48.783,108.743-108.744
              c0-14.4-2.821-28.152-7.927-40.742h208.069c-5.107,12.59-7.928,26.342-7.928,40.742
              C469.675,776.858,518.457,825.641,578.418,825.641z M209.46,716.897c0,22.467-18.277,40.744-40.743,40.744
              c-22.466,0-40.744-18.277-40.744-40.744c0-22.465,18.277-40.742,40.744-40.742C191.183,676.155,209.46,694.432,209.46,716.897z
              M619.162,716.897c0,22.467-18.277,40.744-40.743,40.744s-40.743-18.277-40.743-40.744c0-22.465,18.277-40.742,40.743-40.742
              S619.162,694.432,619.162,716.897z"/>
          </g>
        </g>
      </svg>
      <span class="voo-cart-drawer__sticky-bubble hidden"></span>
    </button>
  `;

    document.body.insertAdjacentHTML("afterbegin", stickyCartBtnMarkup);
    const stickyBtnEl = document.querySelector(".voo-cart-drawer__sticky-btn");

    if (stickyBtnEl)
      stickyBtnEl.addEventListener("click", this.open.bind(this));
  }

  async updateStickyBubble(count) {
    let itemCount = count;
    const stickyBubbleEl = document.querySelector(
      ".voo-cart-drawer__sticky-bubble"
    );

    if (!stickyBubbleEl) return;

    if (!itemCount) {
      const cart = await getCart();
      itemCount = cart.item_count;
    }

    if (itemCount === 0) {
      stickyBubbleEl.classList.add("hidden");
    } else {
      stickyBubbleEl.classList.remove("hidden");
      stickyBubbleEl.innerText = itemCount;
    }
  }

  async checkIfCartIsEmpty(cart) {
    let cartItemsLength;
    const cartDrawerInnerEl = document.querySelector(".voo-cart-drawer__inner");

    if (!cartDrawerInnerEl) return;

    if (cart) {
      cartItemsLength = cart.items.length;
    } else {
      const fetchedCart = await getCart();
      cartItemsLength = fetchedCart.items.length;
    }

    if (cartItemsLength === 0) {
      cartDrawerInnerEl.classList.add("is-empty");
    } else {
      cartDrawerInnerEl.classList.remove("is-empty");
    }
  }

  updateLineProductItem(updatedCart, variantId, line) {
    const updatedProduct = updatedCart.items.find(
      (product) => product.variant_id === variantId
    );
    const updatedLineProductMarkup = this.getLineProductMarkup(
      updatedProduct,
      line
    );

    const parser = new DOMParser();
    const lineProductItemInnerMarkup = parser
      .parseFromString(updatedLineProductMarkup, "text/html")
      .querySelector(".voo-cart-drawer__item")?.innerHTML;

    const currentLineItem = document.querySelector(
      `[data-line-index="${line}"]`
    );

    if (currentLineItem) {
      currentLineItem.innerHTML = lineProductItemInnerMarkup;

      currentLineItem
        .querySelector(".voo-cart-drawer__item-remove")
        .addEventListener("click", this.removeLineProduct.bind(this));

      currentLineItem
        .querySelectorAll("[data-change-type]")
        .forEach((btn) =>
          btn.addEventListener(
            "click",
            this.changeLineProductQuantity.bind(this)
          )
        );

      currentLineItem
        .querySelector(".voo-cart-drawer__item-quantity-input")
        .addEventListener("change", this.updateLineQuantity.bind(this));
    }
  }

  async updateQuantity(line, quantity) {
    const currentLineProductVariantId = Number(
      document.querySelector(`[data-line-index="${line}"]`)?.dataset.variantId
    );

    const body = JSON.stringify({
      line,
      quantity,
    });

    const cartChangeRes = await fetch(
      `${routes.cart_change_url}`,
      getFetchPostConfig(body)
    );

    const updatedCart = await cartChangeRes.json();

    this.checkIfCartIsEmpty(updatedCart);

    const variantsId = updatedCart.items.map((product) => product.variant_id);
    const uniqueVariantsId = new Set(variantsId);
    const hasItemsWithSameVariantId =
      variantsId.length !== uniqueVariantsId.size;

    if (quantity === 0 || hasItemsWithSameVariantId) {
      this.renderCartDrawerItems();
    } else {
      this.updateLineProductItem(
        updatedCart,
        currentLineProductVariantId,
        line
      );
    }

    const cartDrawerEl = document.querySelector("voo-cart-drawer");
    const freeGiftEl = document.querySelector("voo-cart-drawer-free-gift");
    const bogoEl = document.querySelector("voo-cart-drawer-bogo");
    const rewardBarEl = document.querySelector("voo-cart-drawer-reward-bar");

    if (quantity === 0) {
      const recommendationsEl = document.querySelector(
        "voo-cart-drawer-recommendations"
      );

      if (recommendationsEl) recommendationsEl.renderRecommendations();
    }

    if (cartDrawerEl) cartDrawerEl.renderCartDrawerFooter();
    if (freeGiftEl) freeGiftEl.updateFreeGiftMessage();
    if (rewardBarEl) rewardBarEl.updateRewardBar();
    if (bogoEl) bogoEl.productVariantsToCheckInCartForGift();

    this.updateStickyBubble(updatedCart.item_count);
  }

  getLineProductMarkup(lineProduct, index) {
    const productLink = `${location.origin}/products/${lineProduct.handle}`;

    return `<li class="voo-cart-drawer__item" data-variant-id="${
      lineProduct.variant_id
    }" data-line-key="${lineProduct.key}" data-line-index="${index + 1}">
            <div class="voo-cart-drawer__img-wrap">
              <a href="${productLink}" class="voo-cart-drawer__img-link">
                <img
                  class="voo-cart-drawer__img"
                  src="${lineProduct.image}"
                  alt=""
                  width="70"
                  height="70"
                >
              </a>
            </div>
            <div class="voo-cart-drawer__item-content">
              <div class="voo-cart-drawer__top">
                <div class="voo-cart-drawer__item-name-wrap">
                  <h3 class="voo-cart-drawer__item-name">
                    <a href="${productLink}" class="voo-cart-drawer__item-name-link voo-link">
                      ${lineProduct.title}
                    </a>
                  </h3>
                  <p class="voo-cart-drawer__item-properties">${
                    lineProduct.variant_title
                  }</p>
                  <ul class="voo-cart-drawer__item-properties-list voo-list">
                    ${
                      lineProduct.product_has_only_default_variant
                        ? ""
                        : lineProduct.options_with_values.reduce(
                            (markup, option) =>
                              markup +
                              `<li class="voo-cart-drawer__item-property">${option.name}: ${option.value}</li>`,
                            ""
                          )
                    }
                  </ul>
                  ${
                    lineProduct.line_level_discount_allocations.length > 0
                      ? `<span class="voo-cart-drawer__item-discount">
                    <svg aria-hidden="true" focusable="false" width="12" height="12" class="icon icon-discount" viewBox="0 0 12 12">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M7 0h3a2 2 0 012 2v3a1 1 0 01-.3.7l-6 6a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4l6-6A1 1 0 017 0zm2 2a1 1 0 102 0 1 1 0 00-2 0z" fill="currentColor"></path>
                    </svg>
                    <ul class="voo-cart-drawer__item-discount-list voo-list">
                      ${lineProduct.line_level_discount_allocations.reduce(
                        (markup, discount) =>
                          markup +
                          `<li class="voo-cart-drawer__item-discount-name">${
                            discount.discount_application.title
                          } ${
                            discount.amount
                              ? `(-${Shopify.formatMoney(discount.amount)})`
                              : ""
                          }
                            </li >`,
                        ""
                      )}
                    </ul>
                  </span>`
                      : ""
                  }
                </div>
                <button class="voo-cart-drawer__item-remove voo-btn">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    focusable="false"
                    role="presentation"
                    class="icon icon-close"
                    fill="none"
                    viewBox="0 0 18 17"
                    width="8"
                    height="8"
                  >
                    <path d="M.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z" fill="currentColor" stroke="currentColor"></path>
                  </svg>
                </button>
              </div>
              <div class="voo-cart-drawer__bottom">
                <div class="voo-cart-drawer__item-quantity">
                  <button class="voo-cart-drawer__item-decrease voo-btn" data-change-type="decrease">-</button>
                  <input class="voo-cart-drawer__item-quantity-input" type="text" value="${
                    lineProduct.quantity
                  }">
                  <button class="voo-cart-drawer__item-increase voo-btn" data-change-type="increase">+</button>
                </div>
                <div class="voo-cart-drawer__item-prices-wrap">
                  <span class="voo-cart-drawer__item-prices--original">
                    ${
                      lineProduct.original_line_price ===
                      lineProduct.final_line_price
                        ? ""
                        : Shopify.formatMoney(lineProduct.original_line_price)
                    }
                  </span>
                  <span class="voo-cart-drawer__item-prices--final">${Shopify.formatMoney(
                    lineProduct.final_line_price
                  )}</span>
                </div>
              </div>
            </div>
          </li>
    `;
  }

  getCartDrawerItemsMarkup() {
    return `<voo-cart-drawer-items>
      <ul class="voo-cart-drawer__items voo-list"></ul>
    </voo-cart-drawer-items>`;
  }

  async renderCartDrawerItems() {
    const cart = await getCart();

    const cartItemsMarkup = cart.items.reduce(
      (markup, item, index) => markup + this.getLineProductMarkup(item, index),
      ""
    );

    const cartDrawerItemsEl = document.querySelector(".voo-cart-drawer__items");

    if (cartDrawerItemsEl) cartDrawerItemsEl.innerHTML = cartItemsMarkup;

    document
      .querySelectorAll(".voo-cart-drawer__item-remove")
      .forEach((btn) =>
        btn.addEventListener("click", this.removeLineProduct.bind(this))
      );

    document
      .querySelectorAll("[data-change-type]")
      .forEach((btn) =>
        btn.addEventListener("click", this.changeLineProductQuantity.bind(this))
      );

    document
      .querySelectorAll(".voo-cart-drawer__item-quantity-input")
      .forEach((input) =>
        input.addEventListener("change", this.updateLineQuantity.bind(this))
      );
  }

  async removeLineProduct(e) {
    const currentProductLineIndex = e.target.closest(".voo-cart-drawer__item")
      ?.dataset.lineIndex;
    await this.updateQuantity(currentProductLineIndex, 0);
  }

  async changeLineProductQuantity(e) {
    const cartDrawerItem = e.target.closest(".voo-cart-drawer__item");
    const changeBtnEl =
      e.target.nodeName === "BUTTON"
        ? e.target
        : e.target.closest("[data-change-type]");

    const currentQuantity = Number(
      cartDrawerItem.querySelector(".voo-cart-drawer__item-quantity-input")
        ?.value
    );

    const newQuantity =
      changeBtnEl.dataset.changeType === "decrease"
        ? currentQuantity - 1
        : currentQuantity + 1;

    await this.updateQuantity(cartDrawerItem.dataset.lineIndex, newQuantity);
  }

  async updateLineQuantity(e) {
    const currentProductLineIndex = e.target.closest(".voo-cart-drawer__item")
      ?.dataset.lineIndex;
    const newQuantity = Number(e.target.value);

    await this.updateQuantity(currentProductLineIndex, newQuantity);
  }

  async updateCartDrawerFooterMarkup() {
    const cart = await getCart();
    const totalsValueEl = document.querySelector(
      ".voo-cart-drawer__totals-value"
    );

    if (totalsValueEl)
      totalsValueEl.innerText = Shopify.formatMoney(cart.total_price);
  }

  async renderCartDrawerFooter() {
    const cartDrawerFooterEl = document.querySelector(
      ".voo-cart-drawer__footer"
    );

    if (!cartDrawerFooterEl) return;

    const cart = await getCart();

    const cartDrawerFooterInnerMarkup = `
        <ul class="voo-cart-drawer__footer-discounts voo-list" role="list" aria-label="Discount">
          ${cart.cart_level_discount_applications.reduce(
            (markup, discount) =>
              markup +
              `<li class="voo-cart-drawer__footer-discounts-item">
            <svg aria-hidden="true" width="12" height="12" focusable="false" class="icon icon-discount" viewBox="0 0 12 12">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M7 0h3a2 2 0 012 2v3a1 1 0 01-.3.7l-6 6a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4l6-6A1 1 0 017 0zm2 2a1 1 0 102 0 1 1 0 00-2 0z" fill="currentColor">
            </path>
            </svg>
            ${discount.title}
            (-<span class="money">${Shopify.formatMoney(
              discount.total_allocated_amount
            )}</span>)
          </li>`,
            ""
          )}
        </ul>
        <div class="voo-cart-drawer__totals">
          <h2 class="voo-cart-drawer__totals-title">Subtotal</h2>
          <p class="voo-cart-drawer__totals-value">${Shopify.formatMoney(
            cart.total_price
          )}</p>
        </div>
        <div>
          <button
            type="submit"
            class="voo-cart-drawer__cta-checkout voo-btn"
            name="checkout"
          >
            Checkout
          </button>
          <button class="voo-cart-drawer__cta-continue voo-btn" data-voocart-close>or continue shopping</button>
        </div>`;

    cartDrawerFooterEl.innerHTML = cartDrawerFooterInnerMarkup;
    cartDrawerFooterEl
      .querySelector("[data-voocart-close]")
      .addEventListener("click", this.close.bind(this));
  }
}

customElements.define("voo-cart-drawer", VooCartDrawer);

class VooCartDrawerItems extends HTMLElement {
  constructor() {
    super();

    this.renderCartDrawerItems();
  }

  async renderCartDrawerItems() {
    const cartDrawerItemsEl = document.querySelector(".voo-cart-drawer__items");
    const cart = await getCart();
    const cartItemsMarkup = cart.items.reduce((markup, item, index) => {
      return markup + this.getLineProductMarkup(item, index);
    }, "");

    if (cartDrawerItemsEl) cartDrawerItemsEl.innerHTML = cartItemsMarkup;

    document
      .querySelectorAll(".voo-cart-drawer__item-remove")
      .forEach((btn) =>
        btn.addEventListener("click", this.removeLineProduct.bind(this))
      );

    document
      .querySelectorAll("[data-change-type]")
      .forEach((btn) =>
        btn.addEventListener("click", this.changeLineProductQuantity.bind(this))
      );

    document
      .querySelectorAll(".voo-cart-drawer__item-quantity-input")
      .forEach((input) =>
        input.addEventListener("change", this.updateLineQuantity.bind(this))
      );
  }

  async removeLineProduct(e) {
    const currentProductLineIndex = e.target.closest(".voo-cart-drawer__item")
      ?.dataset.lineIndex;
    await this.updateQuantity(currentProductLineIndex, 0);
  }

  async changeLineProductQuantity(e) {
    const cartDrawerItemEl = e.target.closest(".voo-cart-drawer__item");
    const changeBtnEl =
      e.target.nodeName === "BUTTON"
        ? e.target
        : e.target.closest("[data-change-type]");

    const currentQuantity = Number(
      cartDrawerItemEl.querySelector(".voo-cart-drawer__item-quantity-input")
        ?.value
    );
    const newQuantity =
      changeBtnEl.dataset.changeType === "decrease"
        ? currentQuantity - 1
        : currentQuantity + 1;

    await this.updateQuantity(cartDrawerItemEl.dataset.lineIndex, newQuantity);
  }

  async updateLineQuantity(e) {
    const currentProductLineIndex = e.target.closest(".voo-cart-drawer__item")
      ?.dataset.lineIndex;
    const newQuantity = Number(e.target.value);

    await this.updateQuantity(currentProductLineIndex, newQuantity);
  }

  updateLineProductItem(updatedCart, variantId, line) {
    const updatedProduct = updatedCart.items.find(
      (product) => product.variant_id === variantId
    );
    const updatedLineProductMarkup = this.getLineProductMarkup(
      updatedProduct,
      line
    );

    const parser = new DOMParser();
    const lineProductItemInnerMarkup = parser
      .parseFromString(updatedLineProductMarkup, "text/html")
      .querySelector(".voo-cart-drawer__item")?.innerHTML;

    const currentLineItem = document.querySelector(
      `[data-line-index="${line}"]`
    );

    if (currentLineItem) {
      currentLineItem.innerHTML = lineProductItemInnerMarkup;
      const itemRemoveBtn = currentLineItem.querySelector(
        ".voo-cart-drawer__item-remove"
      );
      const quantityInputEl = currentLineItem.querySelector(
        ".voo-cart-drawer__item-quantity-input"
      );

      if (itemRemoveBtn)
        itemRemoveBtn.addEventListener(
          "click",
          this.removeLineProduct.bind(this)
        );

      currentLineItem
        .querySelectorAll("[data-change-type]")
        .forEach((btn) =>
          btn.addEventListener(
            "click",
            this.changeLineProductQuantity.bind(this)
          )
        );

      if (quantityInputEl)
        quantityInputEl.addEventListener(
          "change",
          this.updateLineQuantity.bind(this)
        );
    }
  }

  async updateQuantity(line, quantity) {
    const currentLineProductVariantId = Number(
      document.querySelector(`[data-line-index="${line}"]`)?.dataset.variantId
    );

    const body = JSON.stringify({
      line,
      quantity,
    });

    const cartChangeRes = await fetch(
      `${routes.cart_change_url}`,
      getFetchPostConfig(body)
    );

    const updatedCart = await cartChangeRes.json();
    this.checkIfCartIsEmpty(updatedCart);

    const variantsId = updatedCart.items.map((product) => product.variant_id);
    const uniqueVariantsId = new Set(variantsId);
    const hasItemsWithSameVariantId =
      variantsId.length !== uniqueVariantsId.size;

    if (quantity === 0 || hasItemsWithSameVariantId) {
      this.renderCartDrawerItems();
    } else {
      this.updateLineProductItem(
        updatedCart,
        currentLineProductVariantId,
        line
      );
    }

    const cartDrawerEl = document.querySelector("voo-cart-drawer");
    const freeGiftEl = document.querySelector("voo-cart-drawer-free-gift");
    const bogoEl = document.querySelector("voo-cart-drawer-bogo");
    const rewardBarEl = document.querySelector("voo-cart-drawer-reward-bar");

    if (quantity === 0 || line === 1) {
      const recommendationsEl = document.querySelector(
        "voo-cart-drawer-recommendations"
      );

      if (recommendationsEl) recommendationsEl.renderRecommendations();
    }

    if (cartDrawerEl) {
      cartDrawerEl.renderCartDrawerFooter();
      cartDrawerEl.updateStickyBubble(updatedCart.item_count);
    }

    if (freeGiftEl) rewardBarEl.updateRewardBar();
    if (bogoEl) bogoEl.productVariantsToCheckInCartForGift();
  }

  async checkIfCartIsEmpty(cart) {
    let cartItemsLength;

    if (!cart) {
      const fetchedCart = await getCart();
      cartItemsLength = fetchedCart.items.length;
    } else {
      cartItemsLength = cart.items.length;
    }

    const cartDrawerInnerEl = document.querySelector(".voo-cart-drawer__inner");

    if (cartItemsLength === 0) {
      cartDrawerInnerEl.classList.add("is-empty");
    } else {
      cartDrawerInnerEl.classList.remove("is-empty");
    }
  }

  getLineProductMarkup(lineProduct, index) {
    const productLink = `${location.origin}/products/${lineProduct.handle}`;

    return `
      <li class="voo-cart-drawer__item" data-variant-id="${
        lineProduct.variant_id
      }" data-line-key="${lineProduct.key}" data-line-index="${index + 1}">
        <div class="voo-cart-drawer__img-wrap">
          <a href="${productLink}" class="voo-cart-drawer__img-link">
            <img
              class="voo-cart-drawer__img"
              src="${lineProduct.image}"
              alt=""
              width="70"
              height="70"
            >
          </a>
        </div>
        <div class="voo-cart-drawer__item-content">
          <div class="voo-cart-drawer__top">
            <div class="voo-cart-drawer__item-name-wrap">
              <h3 class="voo-cart-drawer__item-name">
                <a href="${productLink}" class="voo-cart-drawer__item-name-link voo-link">
                  ${lineProduct.title}
                </a>
              </h3>
              <p class="voo-cart-drawer__item-properties">${
                lineProduct.variant_title
              }<p>
              <ul class="voo-cart-drawer__item-properties-list voo-list">
                ${
                  lineProduct.product_has_only_default_variant
                    ? ""
                    : lineProduct.options_with_values.reduce(
                        (markup, option) =>
                          markup +
                          `<li class="voo-cart-drawer__item-property">${option.name}: ${option.value}</li>`,
                        ""
                      )
                }
              </ul>
              ${
                lineProduct.line_level_discount_allocations.length > 0
                  ? `<span class="voo-cart-drawer__item-discount">
                <svg aria-hidden="true" focusable="false" width="12" height="12" class="icon icon-discount" viewBox="0 0 12 12">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M7 0h3a2 2 0 012 2v3a1 1 0 01-.3.7l-6 6a1 1 0 01-1.4 0l-4-4a1 1 0 010-1.4l6-6A1 1 0 017 0zm2 2a1 1 0 102 0 1 1 0 00-2 0z" fill="currentColor"></path>
                </svg>
                <ul class="voo-cart-drawer__item-discount-list voo-list">
                  ${lineProduct.line_level_discount_allocations.reduce(
                    (markup, discount) =>
                      markup +
                      `<li class="voo-cart-drawer__item-discount-name">${
                        discount.discount_application.title
                      } ${
                        discount.amount
                          ? `(-${Shopify.formatMoney(discount.amount)})`
                          : ""
                      }
                        </li >`,
                    ""
                  )}
                </ul>
              </span>`
                  : ""
              }
            </div>
            <button class="voo-cart-drawer__item-remove voo-btn">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
                role="presentation"
                class="icon icon-close"
                fill="none"
                viewBox="0 0 18 17"
                width="8"
                height="8"
              >
                <path d="M.865 15.978a.5.5 0 00.707.707l7.433-7.431 7.579 7.282a.501.501 0 00.846-.37.5.5 0 00-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 10-.707-.708L8.991 7.853 1.413.573a.5.5 0 10-.693.72l7.563 7.268-7.418 7.417z" fill="currentColor" stroke="currentColor"></path>
              </svg>
            </button>
          </div>
          <div class="voo-cart-drawer__bottom">
            <div class="voo-cart-drawer__item-quantity">
              <button class="voo-cart-drawer__item-decrease voo-btn" data-change-type="decrease">-</button>
              <input class="voo-cart-drawer__item-quantity-input" type="text" value="${
                lineProduct.quantity
              }">
              <button class="voo-cart-drawer__item-increase voo-btn" data-change-type="increase">+</button>
            </div>
            <div class="voo-cart-drawer__item-prices-wrap">
              <span class="voo-cart-drawer__item-prices--original">
                ${
                  lineProduct.original_line_price ===
                  lineProduct.final_line_price
                    ? ""
                    : Shopify.formatMoney(lineProduct.original_line_price)
                }
              </span>
              <span class="voo-cart-drawer__item-prices--final">${Shopify.formatMoney(
                lineProduct.final_line_price
              )}</span>
            </div>
          </div>
        </div>
      </li>
    `;
  }
}

customElements.define("voo-cart-drawer-items", VooCartDrawerItems);

class VooCartNote extends HTMLElement {
  constructor() {
    super();

    this.init();
  }

  init() {
    const noteTextareaEl = this.querySelector(
      ".voo-cart-drawer__note-textarea"
    );
    this.addTriggerListener();
    this.renderCurrentCartNote();

    if (noteTextareaEl) {
      noteTextareaEl.addEventListener(
        "change",
        debounce((event) => {
          const body = JSON.stringify({ note: event.target.value });
          fetch(`${routes.cart_update_url}`, getFetchPostConfig(body));
        }, 300)
      );
    }
  }

  async renderCurrentCartNote() {
    const textareaEl = this.querySelector(".voo-cart-drawer__note-textarea");

    if (!textareaEl) return;

    const cart = await getCart();
    textareaEl.value = cart.note;
  }

  addTriggerListener() {
    const noteTriggerEl = this.querySelector(".voo-cart-drawer__note-trigger");

    if (!noteTriggerEl) return;

    const cartNoteEl = this.querySelector(".voo-cart-drawer__note-textarea");
    const triggerCartNote = () => {
      if (cartNoteEl.classList.contains("voo-hidden")) {
        cartNoteEl.classList.remove("voo-hidden");
        return;
      }

      cartNoteEl.classList.add("voo-hidden");
    };

    noteTriggerEl.addEventListener("click", triggerCartNote);
  }
}

customElements.define("voo-cart-note", VooCartNote);

class VooCartDrawerAnnouncement extends HTMLElement {
  constructor() {
    super();

    this.initSiemaSlider();
  }

  initSiemaSlider() {
    let intervalId;

    if (typeof Siema == "undefined") {
      this.style.display = "none";
      return;
    }

    const announcementSlider = new Siema({
      selector: ".siema.voo-cart-drawer__announcement-list",
      loop: true,
    });

    if (this.dataset.autoplay)
      intervalId = setInterval(() => announcementSlider.next(), 3000);

    const hideControls = announcementSlider.innerElements.length < 2;

    const onAnnouncementSliderControlsClick = (e) => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = "";
      }

      if (e.currentTarget.classList.contains("prev")) {
        announcementSlider.prev();
      } else {
        announcementSlider.next();
      }
    };

    this.querySelectorAll(".voo-cart-drawer__announcement-btn").forEach(
      (btn) => {
        if (hideControls) btn.style.display = "none";

        btn.addEventListener("click", onAnnouncementSliderControlsClick);
      }
    );
    this.setTimer();

    const elemsToBeCopied = this.querySelectorAll("strong");
    const validElemsToBeCopied = [...elemsToBeCopied].filter(
      (el) => !el.classList.contains("expiration-time")
    );

    validElemsToBeCopied.forEach((code) =>
      code.insertAdjacentHTML(
        "afterbegin",
        '<span class="voo-cart-drawer__announcement-copy-msg">Copy to clipboard</span>'
      )
    );

    const copyCode = (event) => {
      const copyMsgEl = event.target.querySelector(
        ".voo-cart-drawer__announcement-copy-msg"
      );
      navigator.clipboard.writeText(event.target.childNodes[1].textContent);

      if (copyMsgEl) copyMsgEl.innerText = "Copied";
    };

    const onMouseEnter = (event) => {
      const copyMsgEl = event.target.querySelector(
        ".voo-cart-drawer__announcement-copy-msg"
      );

      if (copyMsgEl) copyMsgEl.innerText = "Copy to clipboard";
    };

    validElemsToBeCopied.forEach((boldEl) => {
      boldEl.addEventListener("click", copyCode);
      boldEl.addEventListener("mouseenter", onMouseEnter);
    });
  }

  setTimer() {
    const sliderStrongTags = this.querySelectorAll("strong");
    const timerEl = [...sliderStrongTags].find((tag) =>
      tag.innerHTML.includes("{timer")
    );

    if (!timerEl) return;

    timerEl.classList.add("expiration-time");

    const timerInnerText = timerEl.innerHTML.slice(1, -1);
    const [timerPlug, minutesToCountDown] = timerInnerText.split(":");
    const secondsToCountDown = "00";

    const startDateTimestamp = new Date().getTime();
    const timeDifferenceInMilliseconds =
      (Number(secondsToCountDown) + Number(minutesToCountDown) * 60) * 1000;
    const timestampToCreateEndDate =
      startDateTimestamp + timeDifferenceInMilliseconds;
    const finishDate = new Date(timestampToCreateEndDate);

    const timerInterval = setInterval(function () {
      const now = new Date().getTime();
      const distance = Math.round((finishDate - now) / 1000) * 1000;

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      timerEl.innerText =
        (minutes > 9 ? minutes : `0${minutes}`) +
        ":" +
        (seconds > 9 ? seconds : `0${seconds}`);

      if (distance < 0) {
        clearInterval(timerInterval);
        timerEl.innerText = "00:00";
      }
    }, 1000);
  }
}

customElements.define(
  "voo-cart-drawer-announcement",
  VooCartDrawerAnnouncement
);

class vooCartDrawerFreeGift extends HTMLElement {
  constructor() {
    super();

    this.fillWithVariantData();
  }

  async getProductVariantData(variantId) {
    try {
      const res = await fetch(`/variants/${variantId}.js`);

      if (!res.ok) {
        throw new Error("HTTP error: ", res.status);
      }

      return await res.json();
    } catch (error) {
      console.error(error.message);
    }
  }

  async fillWithVariantData() {
    const { productVariantId, targetTotal } =
      VOOCART.config.blocks.freeGift.settings;
    const giftVariantData = await this.getProductVariantData(productVariantId);

    const giftImageEl = this.querySelector(".voo-cart-drawer__gift-img");
    const giftNameEl = this.querySelector(".voo-cart-drawer__gift-name");
    const giftTotalLeftEl = this.querySelector(
      ".voo-cart-drawer__gift-total-left"
    );

    if (giftImageEl) {
      giftImageEl.src = giftVariantData.featured_image.src;
      giftImageEl.alt = giftVariantData.name;
    }

    if (giftNameEl) giftNameEl.innerText = giftVariantData.name;

    if (giftTotalLeftEl)
      giftTotalLeftEl.innerText = Shopify.formatMoney(targetTotal * 100);

    this.updateFreeGiftMessage();
  }

  async addGiftProductToCart() {
    const { productVariantId } = VOOCART.config.blocks.freeGift.settings;
    const cart = await getCart();
    const giftProductIndexCartIndex = cart.items.findIndex(
      (lineProductItem) => lineProductItem.variant_id === productVariantId
    );
    const cartDrawerEl = document.querySelector("voo-cart-drawer");

    if (giftProductIndexCartIndex === -1 && cartDrawerEl) {
      await cartDrawerEl.addProduct(productVariantId);
    }
  }

  // async removeGiftProductFromCart() {
  //   const { productVariantId } = VOOCART.config.blocks.freeGift.settings;
  //   const cart = await getCart();
  //   const lineIndexOfGiftProduct = cart.items.findIndex(
  //     (cartLineItem) => cartLineItem.variant_id === productVariantId
  //   );

  //   if (lineIndexOfGiftProduct !== -1) {
  //     await document
  //       .querySelector("voo-cart-drawer")
  //       .updateQuantity(lineIndexOfGiftProduct, 0);
  //   }
  // }

  async updateFreeGiftMessage() {
    const { targetTotal, productVariantId } =
      VOOCART.config.blocks.freeGift.settings;
    const cartDrawerEl = document.querySelector("voo-cart-drawer");
    const totalLeftToGetGiftEl = this.querySelector(
      ".voo-cart-drawer__gift-total-left"
    );
    const freeGiftWrapperEl = this.querySelector(
      ".voo-cart-drawer__gift-message-wrapper"
    );

    const cart = await getCart();
    const giftProductInCart = cart.items.find(
      (cartLineItem) => cartLineItem.variant_id === productVariantId
    );

    const giftProductLineTotal = giftProductInCart
      ? giftProductInCart.line_price / 100
      : 0;

    const currentCartTotal = cart.items_subtotal_price / 100;
    const totalLeftToGetGift =
      targetTotal - currentCartTotal + giftProductLineTotal;

    if (totalLeftToGetGift <= 0) {
      freeGiftWrapperEl.style.display = "none";
      await this.addGiftProductToCart();
      cartDrawerEl.renderCartDrawerItems();
      return;
    }

    // await this.removeGiftProductFromCart();
    cartDrawerEl.renderCartDrawerItems();
    freeGiftWrapperEl.style.display = "flex";

    if (totalLeftToGetGiftEl)
      totalLeftToGetGiftEl.innerText = Shopify.formatMoney(
        totalLeftToGetGift * 100
      );
  }
}

customElements.define("voo-cart-drawer-free-gift", vooCartDrawerFreeGift);

class VooCartDrawerRecommendations extends HTMLElement {
  constructor() {
    super();

    this.renderRecommendations();
  }

  recommendationProductsData = [];

  addEventListenersForAddBtns() {
    const addRecommendationProductBtnElems = this.querySelectorAll(
      ".voo-cart-drawer__recommendations-add-btn"
    );
    addRecommendationProductBtnElems.forEach((btn) =>
      btn.addEventListener("click", this.addProductToCart.bind(this))
    );
  }

  initSiemaRecommendationSlider() {
    if (!(VOOCART.config.blocks.recommendations.settings.navMode === "slider"))
      return;

    const prevBtnEl = this.querySelector(
      ".voo-cart-drawer__recommendations-controls-btn.prev"
    );
    const nextBtnEl = this.querySelector(
      ".voo-cart-drawer__recommendations-controls-btn.next"
    );

    const recommendationSlider = new Siema({
      selector: ".voo-cart-drawer__recommendations-list",
      loop: false,
      autoHeight: false,
      onChange: () => {
        prevBtnEl.disabled = recommendationSlider.currentSlide === 0;
        nextBtnEl.disabled =
          recommendationSlider.currentSlide ===
          recommendationSlider.innerElements.length - 1;
      },
    });

    prevBtnEl.disabled = recommendationSlider.currentSlide === 0;
    nextBtnEl.disabled =
      recommendationSlider.currentSlide ===
      recommendationSlider.innerElements.length - 1;

    const hideControls = recommendationSlider.innerElements.length < 2;

    const onRecommendationSliderControlsClick = (e) => {
      if (e.currentTarget.classList.contains("prev")) {
        recommendationSlider.prev();
      } else {
        recommendationSlider.next();
      }
    };

    this.querySelectorAll(
      ".voo-cart-drawer__recommendations-controls-btn"
    ).forEach((btn) => {
      if (hideControls) {
        btn.style.display = "none";
      }

      btn.addEventListener("click", onRecommendationSliderControlsClick);
    });
  }

  getProductVariantData(productId, variantId) {
    const productData = this.recommendationProductsData.find(
      (product) => product.id === productId
    );
    return productData.variants.find((variant) => variant.id === variantId);
  }

  addEventListenersForVariantSelects() {
    const recommendationSelectElems = this.querySelectorAll(
      ".voo-cart-drawer__recommendations-select"
    );

    const onVariantChange = async (e) => {
      const recommendationProductEl = e.target.closest("[data-variant-id]");

      if (!recommendationProductEl) return;

      const chosenVariant = Number(e.target.value);
      const chosenVariantData = this.getProductVariantData(
        Number(recommendationProductEl.dataset.productId),
        chosenVariant
      );

      recommendationProductEl.dataset.variantId = chosenVariant;
      recommendationProductEl.querySelector(
        ".voo-cart-drawer__recommendations-original"
      ).innerText = Shopify.formatMoney(chosenVariantData.price);
      recommendationProductEl.querySelector(
        ".voo-cart-drawer__recommendations-compare-at"
      ).innerText = Shopify.formatMoney(chosenVariantData.compare_at_price);
    };

    recommendationSelectElems.forEach((recProductEl) =>
      recProductEl.addEventListener("change", onVariantChange)
    );
  }

  async getProductData(productHandle) {
    const res = await fetch(`/products/${productHandle}.js`);
    const productData = await res.json();

    return productData;
  }

  createRecommendationMarkup(product) {
    const productLink = `${location.origin}/products/${product.handle}`;
    const productImage = product.featured_image
      ? product.featured_image
      : product.media
      ? product.media[0].preview_image.src
      : "//voodoo-dev-store.com/cdn/shop/products/AAUvwnj0ICORVuxs41ODOvnhvedArLiSV20df7r8XBjEUQ_s900-c-k-c0x00ffffff-no-rj_ca8a6d1d-8fd6-4ac4-afcf-ab7f62dd92b4.jpg?v=1670516969&width=1946";

    return `<li class="voo-cart-drawer__recommendations-item" data-product-id=${
      product.id
    } data-variant-id=${product.variants[0].id}>
        <div class="voo-cart-drawer__recommendations-info">
          <div class="voo-cart-drawer__recommendations-img-wrap">
            <a class="voo-cart-drawer__recommendations-img-link" href="${productLink}">
              <img
                class="voo-cart-drawer__recommendations-img"
                src="${productImage}"
                alt="${product.title}"
                loading="lazy"
                width="50"
                height="50"
              >
            </a>
          </div>
          <div class="voo-cart-drawer__recommendations-text">
            <a href="${productLink}" class="voo-link">
              <h4 class="voo-cart-drawer__recommendations-name">${
                product.title
              }</h4>
            </a>
            ${
              product.variants.length === 1
                ? ""
                : `<select class="voo-cart-drawer__recommendations-select voo-select">
                    ${product.variants.reduce((markup, variant) => {
                      if (variant.available) {
                        return (
                          markup +
                          `<option class="voo-cart-drawer__recommendations-option" value="${variant.id}">${variant.title}</option>`
                        );
                      }
                    }, "")}
                  </select>`
            }
            <div class="voo-cart-drawer__recommendations-prices">
              <span class="money voo-cart-drawer__recommendations-original">${Shopify.formatMoney(
                product.variants[0].price
              )}</span>
              ${
                product.variants[0].compare_at_price
                  ? `<span class="voo-cart-drawer__recommendations-compare-at money">${Shopify.formatMoney(
                      product.variants[0].compare_at_price
                    )}</span>`
                  : ""
              }
            </div>
          </div>
        </div>
        <div class="voo-cart-drawer__recommendations-add">
          <button class="voo-btn voo-cart-drawer__recommendations-add-btn">Add</button>
        </div>
      </li>`;
  }

  async addProductToCart(e) {
    const targetAddBtn = e.target;
    const recommendationProductVariant =
      e.target.closest("[data-variant-id]").dataset.variantId;

    const body = JSON.stringify({
      items: [
        {
          id: recommendationProductVariant,
          quantity: 1,
        },
      ],
    });

    try {
      targetAddBtn.innerText = "Adding";
      targetAddBtn.disabled = true;
      const res = await fetch(
        window.Shopify.routes.root + "cart/add.js",
        getFetchPostConfig(body)
      );

      if (!res.ok) return;

      const vooCartDrawerEl = document.querySelector("voo-cart-drawer");
      await vooCartDrawerEl.renderDynamicContent();

      targetAddBtn.innerText = "Add";

      await this.renderRecommendations();
    } catch (error) {
      targetAddBtn.innerText = "Add";
      targetAddBtn.disabled = false;
      console.error("Error:", error);
    }
  }

  async getRecommendations(productId, limit = 4) {
    const res = await fetch(
      `/recommendations/products.json?product_id=${productId}&limit=${limit}`
    );
    const recommendationsData = await res.json();
    return recommendationsData;
  }

  async renderRecommendations() {
    const cart = await getCart();
    const recommendationsListEl = this.querySelector(
      ".voo-cart-drawer__recommendations-list"
    );

    let counter = 0;
    const { productList, useRecommendationsApi, limit } =
      VOOCART.config.blocks.recommendations.settings;

    if (useRecommendationsApi) {
      const firstProductId = cart.items[0]?.product_id;
      if (!firstProductId) return;
      const recommendationsData = await this.getRecommendations(
        firstProductId,
        limit
      );
      this.recommendationProductsData = recommendationsData.products;
    } else {
      this.recommendationProductsData = productList;
    }

    const recommendationMarkup = this.recommendationProductsData.reduce(
      (markup, product) => {
        if (counter > limit - 1) return markup;
        if (
          cart.items.find(
            (cartProduct) => product.id === cartProduct.product_id
          )
        )
          return markup;

        counter += 1;
        return (markup += this.createRecommendationMarkup(product));
      },
      ""
    );

    if (recommendationsListEl)
      recommendationsListEl.innerHTML = recommendationMarkup;
    this.style.display = recommendationMarkup ? "block" : "none";
    this.addEventListenersForAddBtns();
    this.addEventListenersForVariantSelects();
    this.initSiemaRecommendationSlider();
  }
}

customElements.define(
  "voo-cart-drawer-recommendations",
  VooCartDrawerRecommendations
);

class VooCartDrawerRewardBar extends HTMLElement {
  constructor() {
    super();

    this.getRewardsMarkup();
    this.updateRewardBar();
  }

  updateRewardBar() {
    this.renderProgressMessages();
    this.updateProgressLine();
  }

  getLastReward() {
    const sortedRewards = VOOCART.config.blocks.rewardBar.settings.rewards.sort(
      this.sortByTargetTotal
    );

    return sortedRewards[sortedRewards.length - 1];
  }

  async getPercentageOfProgressLineFill(cartTotal) {
    let currentCartTotal = cartTotal;
    if (!cartTotal) {
      const cart = await getCart();
      currentCartTotal = cart.items_subtotal_price / 100;
    }
    const lastRewardTargetTotal = Number(this.getLastReward().targetTotal);
    return (((currentCartTotal / 100) * 100) / lastRewardTargetTotal) * 100;
  }

  async updateProgressLine() {
    const progressLineEl = this.querySelector(
      ".voo-cart-drawer__reward-bar-line"
    );
    const percentage = await this.getPercentageOfProgressLineFill();

    if (progressLineEl)
      progressLineEl.style.background =
        this.getGradientForProgressLine(percentage);
  }

  getGradientForProgressLine(percentage) {
    return `linear-gradient(to right, black ${percentage}%, rgba(0,0,0,0.1) ${percentage}%)`;
  }

  async countTotalLeftToGetDiscount() {
    const cart = await getCart();
    const totalPriceLeftToGetDiscount =
      this.totalToGetDiscount - cart.items_subtotal_price / 100;

    return {
      amount: totalPriceLeftToGetDiscount,
      fullPercentage:
        (cart.items_subtotal_price / 100 / this.totalToGetDiscount) * 100,
    };
  }

  sortByTargetTotal(a, b) {
    const targetTotalA = Number(a.targetTotal);
    const targetTotalB = Number(b.targetTotal);

    if (targetTotalA > targetTotalB) {
      return 1;
    }

    if (targetTotalA < targetTotalB) {
      return -1;
    }

    return 0;
  }

  async renderProgressMessages() {
    const cart = await getCart();
    const currentTotal = cart.items_subtotal_price / 100;
    const sortedRewards = VOOCART.config.blocks.rewardBar.settings.rewards.sort(
      this.sortByTargetTotal
    );
    const nextReward = sortedRewards.find(
      (reward) => currentTotal < Number(reward.targetTotal)
    );
    const appliedRewards = sortedRewards.filter(
      (reward) => currentTotal > reward.targetTotal
    );
    const spendMessageEl = this.querySelector(
      ".voo-cart-drawer__reward-bar-message-spend"
    );
    const appliedRewardsMessageEl = this.querySelector(
      ".voo-cart-drawer__reward-bar-message-applied"
    );

    const getAppliedRewardsMessage = (appliedRewards) => {
      let joinedRewardsString = "";
      if (appliedRewards.length < 3) {
        joinedRewardsString = appliedRewards
          .map((reward) => reward.title)
          .join(" and ");
      } else {
        const appliedRewardsWithoutLastOne = appliedRewards.slice(0, -1);
        joinedRewardsString =
          appliedRewardsWithoutLastOne
            .map((reward) => reward.title)
            .join(", ") +
          " and " +
          appliedRewards[appliedRewards.length - 1].title;
      }

      return joinedRewardsString + " applied!";
    };

    if (appliedRewardsMessageEl)
      appliedRewardsMessageEl.innerText =
        getAppliedRewardsMessage(appliedRewards);

    if (!nextReward) {
      spendMessageEl && spendMessageEl.classList.add("voo-hidden");
      appliedRewardsMessageEl &&
        appliedRewardsMessageEl.classList.remove("voo-hidden");
      return;
    }

    spendMessageEl && spendMessageEl.classList.remove("voo-hidden");

    if (appliedRewards.length && appliedRewardsMessageEl) {
      appliedRewardsMessageEl.classList.remove("voo-hidden");
    } else {
      appliedRewardsMessageEl.classList.add("voo-hidden");
    }

    const moneyToSpendToGetTheNextReward =
      Number(nextReward.targetTotal) - currentTotal;

    const spendMessageMarkup = `Spend <span class="money-to-spend money">${Shopify.formatMoney(
      moneyToSpendToGetTheNextReward * 100
    )}</span> more to get ${nextReward.title}`;

    if (spendMessageEl) spendMessageEl.innerHTML = spendMessageMarkup;
  }

  getRewardsMarkup() {
    const sortedRewards = VOOCART.config.blocks.rewardBar.settings.rewards.sort(
      this.sortByTargetTotal
    );

    const lastRewardTargetTotal =
      sortedRewards[sortedRewards.length - 1].targetTotal;

    const defineRewardPositionOnProgressLine = (
      rewardTargetTotal,
      maxRewardTargetTotal
    ) => {
      const positionFromLeftInPercentage =
        (100 * rewardTargetTotal) / maxRewardTargetTotal;

      if (positionFromLeftInPercentage === 100) return "right: 0;";
      return `left: ${positionFromLeftInPercentage}%;`;
    };

    const rewardsTitleMarkup = sortedRewards.reduce(
      (markup, reward) =>
        markup +
        `<p class="voo-cart-drawer__reward-name" style="${defineRewardPositionOnProgressLine(
          reward.targetTotal,
          lastRewardTargetTotal
        )}">${reward.title}</p>`,
      ""
    );

    const progressLineWrapEl = this.querySelector(
      ".voo-cart-drawer__reward-bar-line-wrap"
    );
    if (progressLineWrapEl)
      progressLineWrapEl.insertAdjacentHTML("beforeend", rewardsTitleMarkup);
  }
}

customElements.define("voo-cart-drawer-reward-bar", VooCartDrawerRewardBar);

class VooCartDrawerBogo extends HTMLElement {
  constructor() {
    super();

    this.productVariantsToCheckInCartForGift();
  }

  async productVariantsToCheckInCartForGift() {
    const cart = await getCart();
    const productPairs = VOOCART.config.blocks.bogo.settings.pairs;

    const pairsWithXYProductsStatus = productPairs.map((pair) => {
      const XProductsInCart = cart.items.filter((item) => {
        if (pair.productXVariants.length === 0) {
          return pair.productX.id === item.product_id;
        }

        const rightXVariant = pair.productXVariants.find(
          (productVariant) => item.variant_id === Number(productVariant)
        );
        return rightXVariant;
      });

      const YProductsInCart = cart.items.filter((item) => {
        if (pair.productYVariants.length === 0) {
          return pair.productY.id === item.product_id;
        } else {
          const rightYVariant = pair.productYVariants.find(
            (productVariant) => item.variant_id === Number(productVariant)
          );
          return rightYVariant;
        }
      });

      return {
        ...pair,
        XProductIsInCart: XProductsInCart.length !== 0,
        YProductIsInCart: YProductsInCart.length !== 0,
      };
    });

    const pairsWithAvailableGifts = pairsWithXYProductsStatus.filter(
      (pair) => pair.XProductIsInCart
    );

    const isGiftProductInCart = pairsWithXYProductsStatus.find(
      (pair) => pair.YProductIsInCart
    );

    if (isGiftProductInCart || pairsWithAvailableGifts.length === 0) {
      this.classList.add("voo-hidden");
      return;
    } else {
      this.classList.remove("voo-hidden");
    }

    const giftProductsToRender = pairsWithAvailableGifts.map((pair) =>
      pair.productYVariants.length === 0
        ? pair.productY
        : {
            ...pair.productY,
            variants: pair.productY.variants.filter((variant) =>
              pair.productYVariants.find(
                (availableVariant) => Number(availableVariant) === variant.id
              )
            ),
          }
    );

    this.renderGiftProducts(giftProductsToRender);
  }

  addGiftProduct(e) {
    const bogoProductSelect = e.target
      .closest(".voo-cart-drawer__bogo-item")
      ?.querySelector(".voo-cart-drawer__bogo-product-select");

    if (!bogoProductSelect) return;

    const giftVariantId = Number(bogoProductSelect.value);
    document.querySelector("voo-cart-drawer").addProduct(giftVariantId);
  }

  addClickListener() {
    this.querySelectorAll(".voo-cart-drawer__bogo-product-add").forEach((btn) =>
      btn.addEventListener("click", this.addGiftProduct)
    );
  }

  addSelectChangeListener() {
    const giftProductSelectElems = this.querySelectorAll(
      ".voo-cart-drawer__bogo-product-select"
    );

    const onVariantChange = (e) => {
      const chosenVariant = Number(e.target.value);
      const productVariantEl = e.target.closest("[data-variant-id]");
      const bogoProductPrice = productVariantEl.querySelector(
        ".voo-cart-drawer__bogo-product-price"
      );
      const oldVariant = Number(productVariantEl.dataset.variantId);
      const productId = Number(productVariantEl.dataset.productId);

      if (oldVariant === chosenVariant) return;

      const pairWithNewVariantData =
        VOOCART.config.blocks.bogo.settings.pairs.find(
          (pair) => pair.productY.id === productId
        );
      const newVariantData = pairWithNewVariantData.productY.variants.find(
        (variant) => variant.id === chosenVariant
      );

      if (bogoProductPrice)
        bogoProductPrice.innerText = Shopify.formatMoney(newVariantData.price);
    };

    giftProductSelectElems.forEach((giftProductSelectEl) =>
      giftProductSelectEl.addEventListener("change", onVariantChange)
    );
  }

  renderGiftProducts(products) {
    const giftProductsMarkup = products.reduce((markup, product) => {
      return (
        markup +
        `
      <li class="voo-cart-drawer__bogo-item" data-product-id="${
        product.id
      }" data-variant-id="${product.variants[0].id}">
        <img class="voo-cart-drawer__bogo-image" src=${
          product.featured_image
        } alt=${product.title} heigth="150" width="150"/>
        <h4 class="voo-cart-drawer__bogo-product-name">${product.title}</h4>
        <div class="voo-cart-drawer__bogo-product-prices">
          <span class="voo-cart-drawer__bogo-product-price">${Shopify.formatMoney(
            product.price
          )}</span>
          <span class="voo-cart-drawer__bogo-product-free">Free</span>
        </div>
        <select class="voo-cart-drawer__bogo-product-select voo-select">
          ${product.variants.reduce(
            (optionsMarkup, variant) =>
              optionsMarkup +
              `<option value="${variant.id}">${variant.title}</option>`,
            ""
          )}
        </select>
        <button class="voo-cart-drawer__bogo-product-add">Add</button>
      </li>
    `
      );
    }, "");

    this.querySelector(".voo-cart-drawer__bogo-list").innerHTML =
      giftProductsMarkup;

    this.addClickListener();
    this.addSelectChangeListener();
  }
}

customElements.define("voo-cart-drawer-bogo", VooCartDrawerBogo);

class VooCartDrawerDiscount extends HTMLElement {
  constructor() {
    super();

    this.applyBtn = this.querySelector("#apply-discount-btn");
    this.discountCodeError = this.querySelector("#discount-code-error");
    this.discountCodeInput = this.querySelector("#discount-code-input");

    this.addEventListeners();
  }

  addEventListeners() {
    if (this.applyBtn) this.applyBtn.disabled = true;

    const checkoutContainer = document.createElement("div");
    document.body.appendChild(checkoutContainer);

    if (localStorage.discountCode)
      this.applyDiscount(JSON.parse(localStorage.discountCode).code);

    const onApplyBtnClick = (e) => {
      e.preventDefault();
      this.applyDiscount(this.discountCodeInput.value);
    };

    const disableApplyButton = this.disableApplyBtn.bind(this);

    if (this.applyBtn)
      this.applyBtn.addEventListener("click", onApplyBtnClick.bind(this));

    if (this.discountCodeInput)
      this.discountCodeInput.addEventListener("input", (e) =>
        disableApplyButton(e)
      );
  }

  onClearBtnClick = (e) => {
    e.preventDefault();
    this.clearDiscount();
    this.applyDiscount("");
  };

  disableApplyBtn(e) {
    if (!this.applyBtn) return;

    if (e.target.value.length === 0) {
      this.applyBtn.disabled = true;
    } else if (e.target.value.length > 0 && this.applyBtn.disabled) {
      this.applyBtn.disabled = false;
    }
  }

  clearDiscount() {
    if (this.discountCodeError) this.discountCodeError.innerHTML = "";

    this.clearLocalStorage();
  }

  clearLocalStorage() {
    localStorage.removeItem("discountCode");
  }

  async applyDiscount(code) {
    if (this.applyBtn && code) {
      this.applyBtn.innerHTML = 'Applying <div class="loader"></div>';
      this.applyBtn.disabled = true;
    } else {
      const clearBtn = document.getElementById("clear-discount-btn");

      if (clearBtn) clearBtn.disabled = true;
    }

    const thisEl = this;

    const checkResStatus = (res) => {
      if (!res.ok) {
        const error = new Error(`HTTP error: ${res.status}`);
        error.status = res.status;
        throw error;
      }
    };

    try {
      const response = await fetch("/payments/config", { method: "GET" });
      checkResStatus(response);
      const data = await response.json();

      const checkout_json_url = "/wallets/checkouts/";
      const authorization_token = btoa(data.paymentInstruments.accessToken);

      const cartResponse = await fetch("/cart.js", {});
      checkResStatus(cartResponse);
      const cartData = await cartResponse.json();

      const body = {
        checkout: {
          country: Shopify.country,
          discount_code: code,
          line_items: cartData.items,
          presentment_currency: Shopify.currency.active,
        },
      };

      const requestWithTokenOptions = {
        body: JSON.stringify(body),
        credentials: "include",
        headers: {
          accept: "*/*",
          authorization: "Basic " + authorization_token,
          "cache-control": "no-cache",
          "content-type": "application/json, text/javascript",
          pragma: "no-cache",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
        },
        method: "POST",
        mode: "cors",
        referrerPolicy: "strict-origin-when-cross-origin",
      };

      const checkoutResponse = await fetch(
        checkout_json_url,
        requestWithTokenOptions
      );
      checkResStatus(checkoutResponse);
      const checkoutData = await checkoutResponse.json();

      if (
        checkoutData.checkout &&
        checkoutData.checkout.applied_discounts.length > 0
      ) {
        const codeForUrl = code ? code : "+";
        const discountApplyUrl =
          "/discount/" +
          codeForUrl +
          "?v=" +
          Date.now() +
          "&redirect=/checkout/";

        const discountApplyRes = await fetch(discountApplyUrl, {});
        checkResStatus(discountApplyRes);

        if (thisEl.discountCodeError) thisEl.discountCodeError.innerHTML = "";

        const cartDrawerEl = document.querySelector("voo-cart-drawer");

        if (cartDrawerEl) {
          cartDrawerEl.renderCartDrawerFooter();
          cartDrawerEl.renderCartDrawerItems();
        }

        window.dispatchEvent(new Event("resize"));

        thisEl.discountCodeInput.value = "";
        const localStorageValue = {
          code: code.trim(),
          totalCart: checkoutData.checkout.total_line_items_price,
        };
        localStorage.setItem("discountCode", JSON.stringify(localStorageValue));
      } else {
        thisEl.clearLocalStorage();

        if (thisEl.discountCodeError)
          thisEl.discountCodeError.innerHTML = "Invalid code";
      }
    } catch (error) {
      console.error(error);

      if (error.status === 422 && thisEl.discountCodeError)
        thisEl.discountCodeError.innerHTML = "Invalid code";
    } finally {
      if (thisEl.applyBtn) {
        thisEl.applyBtn.innerHTML = "Apply";
        thisEl.applyBtn.disabled = thisEl.discountCodeInput.value
          ? false
          : true;
      }
    }
  }
}

customElements.define("voo-cart-drawer-discount", VooCartDrawerDiscount);

new VooCart();
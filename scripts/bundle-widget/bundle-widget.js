(function () {
  "use strict";

  var FETCH_TIMEOUT_MS = 10000;
  var HIDES_ATC = {
    quantity_break: true,
    bogo: true,
    mix_match: true,
    fixed_bundle: true,
  };

  var THEME_CONTROL_SELECTORS = [
    'button[name="add"]',
    ".product-form__submit",
    ".shopify-payment-button",
    '[name="checkout"]',
  ];

  function formatMoney(cents, currency) {
    if (window.Shopify && typeof window.Shopify.formatMoney === "function") {
      return window.Shopify.formatMoney(cents);
    }
    return (currency || "") + " " + (cents / 100).toFixed(2);
  }

  function applyPriceCents(compare, priceType, discountValue) {
    if (priceType === "percentage" && discountValue > 0) {
      return Math.round(compare * (1 - discountValue / 100));
    }
    if (priceType === "fixed" && discountValue > 0) {
      return Math.max(0, compare - Math.round(Number(discountValue) * 100));
    }
    if (priceType === "flat" && discountValue > 0) {
      return Math.round(Number(discountValue) * 100);
    }
    if (priceType === "free") return 0;
    return compare;
  }

  function resolveCompareCents(saleCents, compareAtCents, useCompareAtPrice) {
    return useCompareAtPrice && compareAtCents > 0 ? compareAtCents : saleCents;
  }

  function itemSaleCents(item, fallbackSaleCents) {
    var sale = Math.round((Number(item.price) || 0) * 100) * (item.quantity || 1);
    return sale || Math.round(fallbackSaleCents * 0.25) * (item.quantity || 1);
  }

  function itemCompareCents(item, fallbackSaleCents, fallbackCompareCents, useCompareAtPrice) {
    var sale = itemSaleCents(item, fallbackSaleCents);
    var compareAt = Math.round((Number(item.compareAtPrice) || 0) * 100) * (item.quantity || 1);
    return resolveCompareCents(sale, compareAt, useCompareAtPrice) ||
      Math.round(fallbackCompareCents * 0.25) * (item.quantity || 1);
  }

  function calculateTierPricing(tier, saleCents, compareCents, useCompareAtPrice) {
    if (tier.kind === "complete") {
      var main = (tier.products || []).find(function (item) {
        return item.isDefault;
      });
      var complements = (tier.products || []).filter(function (item) {
        return !item.isDefault;
      });
      var compareTotal = compareCents;
      var saleTotal = applyPriceCents(
        saleCents,
        (main && main.priceType) || tier.priceType,
        (main && main.discountValue) != null ? main.discountValue : tier.discountValue,
      );
      complements.forEach(function (item) {
        var itemSale = itemSaleCents(item, saleCents);
        compareTotal += itemCompareCents(item, saleCents, compareCents, useCompareAtPrice);
        saleTotal += applyPriceCents(
          itemSale,
          item.priceType || tier.priceType,
          item.discountValue != null ? item.discountValue : tier.discountValue,
        );
      });
      return {
        compareTotal: compareTotal,
        saleTotal: saleTotal,
        savings: Math.max(0, compareTotal - saleTotal),
      };
    }
    if (tier.kind === "bogo") {
      var buy = tier.buyQty || tier.minQuantity || 1;
      var get = tier.getQty || 1;
      var bogoCompare = compareCents * (buy + get);
      var getSale = applyPriceCents(
        saleCents * get,
        tier.getPriceType || "percentage",
        tier.getDiscountValue != null ? tier.getDiscountValue : 100,
      );
      var bogoSale = saleCents * buy + getSale;
      return {
        compareTotal: bogoCompare,
        saleTotal: bogoSale,
        savings: Math.max(0, bogoCompare - bogoSale),
      };
    }
    var qty = tier.minQuantity || 1;
    var compareTotal = compareCents * qty;
    var saleTotal = applyPriceCents(
      saleCents * qty,
      tier.priceType || (tier.discountType === "fixed" ? "fixed" : "percentage"),
      tier.discountValue,
    );
    if (tier.discountType === "flat" && tier.discountValue > 0) {
      saleTotal = Math.round(tier.discountValue * 100);
    }
    return {
      compareTotal: compareTotal,
      saleTotal: saleTotal,
      savings: Math.max(0, compareTotal - saleTotal),
    };
  }

  function money(cents, currency) {
    return formatMoney(cents || 0, currency).trim();
  }

  function interpolateText(template, productTitle, pricing, currency, extras) {
    extras = extras || {};
    var qty = Math.max(1, extras.quantity || 1);
    var sale = pricing.saleTotal || 0;
    var compare = pricing.compareTotal || 0;
    var per = sale / qty;
    var orig = compare / qty;
    var save = money(Math.max(0, orig - per), currency);
    var item = money(per, currency);
    var fields = extras.metafields || [];
    var map = {
      product: productTitle || "",
      variant: extras.variantTitle || productTitle || "",
      saved_total: money(pricing.savings, currency),
      saved_percentage:
        compare > 0 ? Math.round(((pricing.savings || 0) / compare) * 100) + "%" : "0%",
      saved_per_item: save,
      sale_total: money(sale, currency),
      sale_per_item: item,
      sale_per_day: money(sale / 30, currency),
      original_total: money(compare, currency),
      original_per_item: money(orig, currency),
      currency: currency || "",
      quantity: String(qty),
      buy_qty: String(extras.buyQty || qty),
      get_qty: String(extras.getQty || 0),
      gift_count: String(extras.giftCount || 0),
      selling_plan: extras.sellingPlan || "",
      metafield_1: fields[0] || "",
    };
    map.saved_amount = map.saved_total;
    map.unit_price = item;
    map.saved_per_unit = save;
    map.original_unit = map.original_per_item;
    map.unit_qty = map.quantity;
    map.selling_plan_discount = extras.sellingPlanDiscount || "";
    map.metafield_2 = fields[1] || "";
    map.metafield_3 = fields[2] || "";
    map.metafield_4 = fields[3] || "";
    return String(template || "").replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return key in map ? map[key] : "{{" + key + "}}";
    });
  }

  function textExtras(tier) {
    return {
      quantity: tier.kind === "bogo" ? (tier.buyQty || 1) + (tier.getQty || 1) : tier.minQuantity || 1,
      buyQty: tier.buyQty || tier.minQuantity || 1,
      getQty: tier.getQty || 0,
      giftCount: (tier.gifts || []).length,
      sellingPlan: tier.applySellingPlan ? "Subscribe & save" : "",
      sellingPlanDiscount: tier.applySellingPlan ? "10%" : "",
    };
  }

  function appendOverlayBadge(wrap, badge, text) {
    var el = document.createElement("span");
    var kind = badge.style || "simple";
    var label = text || badge.text || "MOST POPULAR";
    el.className = "appify-overlay-badge appify-overlay-badge--" + kind;
    if (kind === "custom") {
      el.style.width = (badge.size || 56) + "px";
      if (badge.imageUrl) {
        el.innerHTML = "<img>";
        el.firstChild.src = badge.imageUrl;
      }
    } else if (kind === "popular") {
      el.style.cssText =
        "width:" + (badge.size || 102) + "px;color:" + (badge.textColor || "#fff") +
        ";background:" + (badge.backgroundColor || "#000");
      el.textContent = "★ Most Popular ★";
    } else if (kind === "border") {
      el.style.cssText = "color:" + (badge.textColor || "#fff") + ";font-size:" + (badge.textSize || 10) + "px";
      el.style.setProperty("--ab-badge-bg", badge.backgroundColor || "#000");
      el.style.setProperty("--ab-badge-th", (badge.thickness || 16) + "px");
      el.style.setProperty("--ab-badge-gap", (badge.distance || 0) + "px");
      (kind = badge.position === "all" ? "top right bottom left" : badge.position || "top")
        .split(" ")
        .forEach(function (side) {
          var strip = document.createElement("span");
          strip.className = "appify-overlay-badge__side appify-overlay-badge__side--" + side;
          strip.textContent = label;
          el.appendChild(strip);
        });
      wrap.className += " appify-bundle-widget__option-wrap--border";
      wrap.style.setProperty("--ab-badge-th", (badge.thickness || 16) + "px");
      wrap.style.setProperty("--ab-badge-gap", (badge.distance || 0) + "px");
    } else {
      el.style.cssText =
        "color:" + (badge.textColor || "#fff") + ";background:" + (badge.backgroundColor || "#000") +
        ";font-size:" + (badge.textSize || 12) + "px";
      el.textContent = label;
    }
    wrap.appendChild(el);
  }

  function savingsBadge(pricing, currency) {
    if (!pricing.savings) return "";
    return "SAVE " + formatMoney(pricing.savings, currency).trim();
  }

  function trackEvent(analyticsUrl, bundleId, eventType, metadata) {
    if (!analyticsUrl) return;
    fetch(analyticsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        eventType: eventType,
        bundleId: bundleId,
        metadata: metadata || {},
      }),
    }).catch(function () {});
  }

  function findProductForm(el) {
    return (
      (el && el.closest && el.closest('form[action*="/cart/add"]')) ||
      document.querySelector('form[action*="/cart/add"]') ||
      document.querySelector(".product-form") ||
      document.querySelector('[data-type="add-to-cart-form"]') ||
      document.querySelector("product-form")
    );
  }

  function setThemePurchaseControlsHidden(hidden, el) {
    var form = findProductForm(el);
    var roots = [];
    if (form) roots.push(form);
    if (form && form.parentElement) roots.push(form.parentElement);
    roots.push(document);

    var seen = new Set();
    roots.forEach(function (root) {
      THEME_CONTROL_SELECTORS.forEach(function (sel) {
        root.querySelectorAll(sel).forEach(function (node) {
          if (seen.has(node)) return;
          if (node.closest && node.closest("[data-appify-bundle-widget]")) return;
          seen.add(node);
          if (hidden) {
            if (!node.hasAttribute("data-appify-prev-display")) {
              node.setAttribute(
                "data-appify-prev-display",
                node.style.display || "",
              );
            }
            node.setAttribute("data-appify-hidden-theme", "true");
            node.style.setProperty("display", "none", "important");
            node.setAttribute("aria-hidden", "true");
          } else if (node.getAttribute("data-appify-hidden-theme") === "true") {
            var prev = node.getAttribute("data-appify-prev-display") || "";
            node.style.display = prev;
            node.removeAttribute("data-appify-hidden-theme");
            node.removeAttribute("data-appify-prev-display");
            node.removeAttribute("aria-hidden");
          }
        });
      });
    });
  }

  function resolveVariantId(container, bundle) {
    var pageVariantId = container.dataset.variantId;
    if (pageVariantId) return pageVariantId;
    var productId = container.dataset.productId;
    if (bundle.items && bundle.items.length) {
      var match = bundle.items.find(function (item) {
        var itemProductId = String(item.productId).replace(
          "gid://shopify/Product/",
          "",
        );
        return (
          item.productId === productId ||
          itemProductId === String(productId || "") ||
          item.variantId === pageVariantId
        );
      });
      return (match || bundle.items[0]).variantId;
    }
    return null;
  }

  function numericVariantId(gid) {
    return Number(String(gid).replace("gid://shopify/ProductVariant/", ""));
  }

  function newInstanceId() {
    return "ab-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function cartRoot() {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";
  }

  function getDawnCartSections() {
    var drawer = document.querySelector("cart-drawer");
    if (drawer && typeof drawer.getSectionsToRender === "function") {
      try {
        return drawer.getSectionsToRender().map(function (section) {
          return section.id;
        });
      } catch (e) {}
    }
    var notification = document.querySelector("cart-notification");
    if (notification && typeof notification.getSectionsToRender === "function") {
      try {
        return notification.getSectionsToRender().map(function (section) {
          return section.id;
        });
      } catch (e) {}
    }
    if (drawer) return ["cart-drawer", "cart-icon-bubble"];
    if (notification) {
      return [
        "cart-notification",
        "cart-notification-product",
        "cart-notification-button",
        "cart-icon-bubble",
      ];
    }
    return ["cart-icon-bubble"];
  }

  function isThemeDrawerSectionHtml(html) {
    if (!html || typeof html !== "string") return false;
    if (html.indexOf("drawer__inner") !== -1) return true;
    if (html.indexOf("cart-drawer-items") !== -1) return true;
    if (html.indexOf("Continue shopping") !== -1) return false;
    if (html.indexOf("title--primary") !== -1) return false;
    return html.indexOf("cart-drawer") !== -1 || html.indexOf("CartDrawer") !== -1;
  }

  function openThemeCartIcon() {
    var cartLink = document.querySelector("#cart-icon-bubble");
    if (cartLink) {
      cartLink.click();
      return true;
    }
    var drawer = document.querySelector("cart-drawer");
    if (drawer && typeof drawer.open === "function") {
      drawer.classList.remove("is-empty");
      drawer.open();
      return true;
    }
    return false;
  }

  function openThemeCart(addResponse) {
    var drawer = document.querySelector("cart-drawer");
    var notification = document.querySelector("cart-notification");
    var sections = (addResponse && addResponse.sections) || {};

    if (
      drawer &&
      typeof drawer.renderContents === "function" &&
      isThemeDrawerSectionHtml(sections["cart-drawer"])
    ) {
      try {
        drawer.classList.remove("is-empty");
        drawer.renderContents(addResponse);
        return;
      } catch (e) {}
    }

    if (
      notification &&
      typeof notification.renderContents === "function" &&
      sections["cart-notification"]
    ) {
      try {
        notification.renderContents(addResponse);
        return;
      } catch (e) {}
    }

    openThemeCartIcon();
  }

  function addItems(items, button) {
    button.disabled = true;
    var original = button.textContent;
    button.textContent = "Adding…";

    var payload = {
      items: items,
      sections: getDawnCartSections(),
      sections_url: window.location.pathname,
    };

    return fetch(cartRoot() + "cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            throw new Error(
              (data && (data.description || data.message)) || "Add to cart failed",
            );
          }
          return data;
        });
      })
      .then(function (data) {
        button.textContent = "Added!";
        openThemeCart(data);
        return data;
      })
      .catch(function () {
        button.textContent = "Try again";
      })
      .finally(function () {
        setTimeout(function () {
          button.disabled = false;
          button.textContent = original || "Add to cart";
        }, 2000);
      });
  }

  function applyStyles(root, widget, config) {
    if (widget) {
      var map = {
        primaryColor: "--ab-primary",
        backgroundColor: "--ab-bg",
        textColor: "--ab-text",
        borderColor: "--ab-border",
        selectedBorderColor: "--ab-selected",
        badgeColor: "--ab-badge",
        badgeTextColor: "--ab-badge-text",
        secondaryColor: "--ab-secondary",
      };
      Object.keys(map).forEach(function (key) {
        if (widget[key]) root.style.setProperty(map[key], widget[key]);
      });
    }
    if (config && config.style) {
      var s = config.style;
      root.className = root.className
        .replace(/appify-bundle-widget--(vertical|horizontal|compact|minimal)/g, "")
        .trim();
      root.classList.add("appify-bundle-widget--" + (s.layout || "vertical"));
      var css = {
        cardsBg: "--ab-bg",
        selectedBg: "--ab-secondary",
        inactiveText: "--ab-inactive-text",
        buttonBg: "--ab-primary",
        buttonText: "--ab-button-text",
        borderColor: "--ab-border",
        titleColor: "--ab-text",
        subtitleColor: "--ab-muted",
        priceColor: "--ab-price",
        fullPriceColor: "--ab-compare",
        blockTitleColor: "--ab-block-title",
        badgeBg: "--ab-badge",
        badgeText: "--ab-badge-text",
      };
      Object.keys(css).forEach(function (key) {
        if (s[key]) root.style.setProperty(css[key], s[key]);
      });
      if (s.cornerRadius != null) root.style.setProperty("--ab-radius", s.cornerRadius + "px");
      if (s.spacing != null) root.style.setProperty("--ab-spacing", s.spacing + "px");
      if (s.blockTitleSize) root.style.setProperty("--ab-block-title-size", s.blockTitleSize + "px");
      if (s.titleSize) root.style.setProperty("--ab-title-size", s.titleSize + "px");
      if (s.subtitleSize) root.style.setProperty("--ab-subtitle-size", s.subtitleSize + "px");
    }
  }

  function applyCustomCss(root, config, bundleId) {
    if (!config || !config.style) return;
    var s = config.style;
    if (!s.customCssEnabled || !s.customCss) return;
    var existing = root.querySelector('[data-appify-custom-css="true"]');
    if (existing) existing.remove();
    var styleEl = document.createElement("style");
    styleEl.setAttribute("data-appify-custom-css", "true");
    var scoped = s.customCss;
    if (bundleId) {
      scoped =
        '[data-appify-bundle-id="' + bundleId + '"] { } /* scope */\n' + s.customCss;
    }
    styleEl.textContent = scoped;
    root.appendChild(styleEl);
  }

  function buildTiers(bundle) {
    var config = bundle.config || {};
    if (config.bars && config.bars.length) {
      return config.bars.map(function (bar) {
        return {
          id: bar.id,
          minQuantity: bar.quantity,
          discountType:
            bar.priceType === "fixed" || bar.priceType === "flat"
              ? bar.priceType === "flat"
                ? "flat"
                : "fixed"
              : "percentage",
          priceType: bar.priceType,
          discountValue: bar.priceType === "full" ? 0 : bar.discountValue,
          label: bar.title,
          subtitle: bar.subtitle,
          badgeText: bar.badgeText || "",
          badgeStyle: bar.badgeStyle || "simple",
          isPopular: bar.isPopular,
          selectedByDefault: bar.selectedByDefault,
          soldOut: bar.soldOut,
          kind: bar.kind || "product",
          products: bar.products || [],
          buyQty: bar.buyQty,
          getQty: bar.getQty,
          getPriceType: bar.getPriceType,
          getDiscountValue: bar.getDiscountValue,
          labelText: bar.label,
          upsell: bar.upsell,
          gifts: bar.gifts,
          highlights: bar.highlights,
          personalisation: bar.personalisation,
          applySellingPlan: bar.applySellingPlan,
        };
      });
    }
    if (bundle.tiers && bundle.tiers.length) return bundle.tiers;
    return [
      {
        minQuantity: 1,
        discountValue: 0,
        discountType: "percentage",
        label: "Single",
        subtitle: "Standard price",
      },
    ];
  }

  function offerItems(bundle) {
    var config = bundle.config || {};
    if (config.offerItems && config.offerItems.length) return config.offerItems;
    return (bundle.items || []).map(function (item) {
      return {
        id: item.variantId,
        productId: item.productId,
        variantId: item.variantId,
        title: item.title || item.productTitle,
        quantity: item.quantity || 1,
        role: item.role || "pool",
        selectedByDefault: false,
        imageUrl: item.imageUrl,
        price: item.price,
      };
    });
  }

  function renderCountdown(container, features) {
    var timer = features && features.countdownTimer;
    if (!timer || !timer.enabled) return;
    var el = document.createElement("div");
    el.className = "appify-bundle-widget__countdown";
    el.style.background = timer.backgroundColor || "#f6f6f7";
    el.style.color = timer.textColor || "#202223";
    el.style.textAlign = timer.alignment || "center";
    el.style.fontSize = (timer.fontSize || 13) + "px";
    if (timer.bold) el.style.fontWeight = "700";
    if (timer.italic) el.style.fontStyle = "italic";
    var end =
      timer.mode === "custom" && timer.customEndDate
        ? new Date(timer.customEndDate).getTime()
        : Date.now() + (timer.durationMinutes || 15) * 60 * 1000;
    function tick() {
      var left = Math.max(0, end - Date.now());
      var mins = Math.floor(left / 60000);
      var secs = Math.floor((left % 60000) / 1000);
      var clock =
        String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
      el.textContent = (timer.title || "Hurry! Offer expires in {{timer}}").replace(
        "{{timer}}",
        clock,
      );
    }
    tick();
    setInterval(tick, 1000);
    container.appendChild(el);
  }

  function renderProgress(container, text, ratio) {
    var wrap = document.createElement("div");
    wrap.className = "appify-bundle-widget__progress";
    wrap.innerHTML =
      '<div class="appify-bundle-widget__progress-label"></div>' +
      '<div class="appify-bundle-widget__progress-track"><div class="appify-bundle-widget__progress-fill"></div></div>';
    wrap.querySelector(".appify-bundle-widget__progress-label").textContent = text;
    wrap.querySelector(".appify-bundle-widget__progress-fill").style.width =
      Math.max(0, Math.min(100, ratio * 100)) + "%";
    container.appendChild(wrap);
  }

  function renderBarExtras(option, tier) {
    if (tier.highlights && tier.highlights.items && tier.highlights.items.length) {
      var list = document.createElement("ul");
      list.className = "appify-bundle-widget__highlights";
      tier.highlights.items.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item.text;
        list.appendChild(li);
      });
      option.appendChild(list);
    }
    if (tier.personalisation) {
      var field = document.createElement("input");
      field.className = "appify-bundle-widget__note";
      field.placeholder = tier.personalisation.placeholder || "Add a note";
      field.maxLength = tier.personalisation.maxLength || 80;
      field.setAttribute("data-appify-note", "true");
      option.appendChild(field);
    }
  }

  function renderCompleteCards(tier, saleCents, compareCents, useCompareAtPrice, currency, productTitle, productImage) {
    var main = (tier.products || []).find(function (item) {
      return item.isDefault;
    });
    var complements = (tier.products || []).filter(function (item) {
      return !item.isDefault;
    });
    var cards = [
      {
        title: productTitle || "Product",
        imageUrl: productImage || "",
        compare: compareCents,
        sale: applyPriceCents(
          saleCents,
          (main && main.priceType) || tier.priceType,
          (main && main.discountValue) != null ? main.discountValue : tier.discountValue,
        ),
      },
    ];
    complements.forEach(function (item) {
      var sale = itemSaleCents(item, saleCents);
      var compare = itemCompareCents(item, saleCents, compareCents, useCompareAtPrice);
      cards.push({
        title: item.title || "Product",
        imageUrl: item.imageUrl || "",
        compare: compare,
        sale: applyPriceCents(
          sale,
          item.priceType || tier.priceType,
          item.discountValue != null ? item.discountValue : tier.discountValue,
        ),
      });
    });
    if (cards.length < 2) {
      var recSale = Math.round(saleCents * 0.25);
      var recCompare = Math.round(compareCents * 0.25);
      cards.push({
        title: "Recommended product",
        imageUrl: "",
        compare: recCompare,
        sale: applyPriceCents(recSale, tier.priceType, tier.discountValue),
      });
    }
    var html = '<span class="appify-bundle-widget__complete">';
    cards.forEach(function (card, index) {
      html +=
        '<span class="appify-bundle-widget__complete-item">' +
        (index > 0 ? '<span class="appify-bundle-widget__complete-plus">+</span>' : "") +
        (card.imageUrl
          ? '<img src="' + card.imageUrl + '" alt="">'
          : '<span class="appify-bundle-widget__complete-ph"></span>') +
        '<span class="appify-bundle-widget__complete-title"></span>' +
        '<span class="appify-bundle-widget__complete-price"><strong>' +
        formatMoney(card.sale, currency) +
        "</strong>" +
        (card.sale < card.compare
          ? "<s>" + formatMoney(card.compare, currency) + "</s>"
          : "") +
        "</span></span>";
    });
    html += "</span>";
    var wrap = document.createElement("span");
    wrap.innerHTML = html;
    wrap.querySelectorAll(".appify-bundle-widget__complete-title").forEach(function (node, i) {
      node.textContent = cards[i].title;
    });
    return wrap.innerHTML;
  }

  function renderTierOptions(container, bundle, tiers, saleCents, compareCents, useCompareAtPrice, currency, onSelect, productTitle) {
    var optionsEl = document.createElement("div");
    optionsEl.className = "appify-bundle-widget__options";
    optionsEl.setAttribute("role", "radiogroup");
    var selectedIndex = tiers.findIndex(function (t) {
      return t.selectedByDefault;
    });
    if (selectedIndex < 0) selectedIndex = Math.min(1, tiers.length - 1);

    tiers.forEach(function (tier, index) {
      var pricing = calculateTierPricing(tier, saleCents, compareCents, useCompareAtPrice);
      var extras = textExtras(tier);
      var wrap = document.createElement("div");
      wrap.className = "appify-bundle-widget__option-wrap";
      var config = bundle.config || {};
      if (config.badgesEnabled !== false) {
        (config.badges || []).forEach(function (item) {
          if (item.barId !== tier.id) return;
          appendOverlayBadge(
            wrap,
            item,
            interpolateText(item.text, productTitle, pricing, currency, extras),
          );
        });
      }
      var option = document.createElement("button");
      option.type = "button";
      option.className =
        "appify-bundle-widget__option" +
        (index === selectedIndex ? " appify-bundle-widget__option--selected" : "");
      option.disabled = !!tier.soldOut;
      var title = interpolateText(tier.label, productTitle, pricing, currency, extras);
      var subtitle = interpolateText(tier.subtitle, productTitle, pricing, currency, extras);
      var badge =
        (tier.badgeText && String(tier.badgeText).trim()) ||
        interpolateText(tier.labelText, productTitle, pricing, currency, extras) ||
        (tier.kind === "complete" ? "" : savingsBadge(pricing, currency));
      var priceHtml =
        pricing.savings > 0
          ? '<span class="appify-bundle-widget__price-compare">' +
            formatMoney(pricing.compareTotal, currency) +
            '</span><span class="appify-bundle-widget__price-sale">' +
            formatMoney(pricing.saleTotal, currency) +
            "</span>"
          : '<span class="appify-bundle-widget__price-sale">' +
            formatMoney(pricing.saleTotal, currency) +
            "</span>";
      option.innerHTML =
        '<span class="appify-bundle-widget__radio"></span>' +
        '<span class="appify-bundle-widget__option-body">' +
        '<span class="appify-bundle-widget__option-header">' +
        '<span class="appify-bundle-widget__option-label">' +
        (title || tier.minQuantity + " pack") +
        '</span><span class="appify-bundle-widget__option-prices">' +
        priceHtml +
        "</span></span>" +
        (subtitle
          ? '<span class="appify-bundle-widget__option-sub">' +
            subtitle +
            "</span>"
          : "") +
        (tier.kind === "complete"
          ? renderCompleteCards(
              tier,
              saleCents,
              compareCents,
              useCompareAtPrice,
              currency,
              productTitle,
              container.dataset.productImage || "",
            )
          : "") +
        (badge
          ? '<span class="appify-bundle-widget__badge">' + badge + "</span>"
          : "") +
        "</span>";
      renderBarExtras(option, tier);
      option.addEventListener("click", function () {
        selectedIndex = index;
        optionsEl.querySelectorAll(".appify-bundle-widget__option").forEach(function (node, i) {
          node.classList.toggle("appify-bundle-widget__option--selected", i === index);
        });
        onSelect(tiers[index]);
      });
      wrap.appendChild(option);
      optionsEl.appendChild(wrap);
    });
    container.appendChild(optionsEl);
    return tiers[selectedIndex];
  }

  function lineProps(bundle, role, extra) {
    var props = {
      _appify_bundle_id: bundle.id,
      _appify_instance: extra && extra.instance,
      _appify_role: role,
    };
    if (extra && extra.kind) props._appify_kind = extra.kind;
    if (extra && extra.gift) props._appify_gift = "1";
    if (extra && extra.note) props.Note = extra.note;
    return props;
  }

  function renderQuantityLike(container, data, analyticsUrl, type) {
    var bundle = data.bundles[0];
    var saleCents = parseInt(container.dataset.variantPriceCents || "0", 10) || 0;
    var compareAtCents = parseInt(container.dataset.variantCompareCents || "0", 10) || 0;
    var currency = container.dataset.currency || "";
    var config = bundle.config || {};
    var useCompareAtPrice = !(config.settings && config.settings.useCompareAtPrice === false);
    var compareCents = resolveCompareCents(saleCents, compareAtCents, useCompareAtPrice);
    var tiers = buildTiers(bundle);
    var selected = { current: null };

    var title = document.createElement("div");
    title.className = "appify-bundle-widget__title";
    title.textContent = bundle.blockTitle || config.blockTitle || bundle.title;
    container.appendChild(title);
    renderCountdown(container, config.features);
    selected.current = renderTierOptions(
      container,
      bundle,
      tiers,
      saleCents,
      compareCents,
      useCompareAtPrice,
      currency,
      function (tier) {
        selected.current = tier;
        trackEvent(analyticsUrl, bundle.id, "click", {
          experimentId: bundle.experimentId,
          variantId: bundle.experimentVariant,
        });
      },
      container.dataset.productTitle || "",
    );

    var next = tiers.find(function (tier) {
      return tier.minQuantity > (selected.current.minQuantity || 1);
    });
    if (next) {
      renderProgress(
        container,
        "Add " +
          (next.minQuantity - (selected.current.minQuantity || 1)) +
          " more for the next tier",
        (selected.current.minQuantity || 1) / next.minQuantity,
      );
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "appify-bundle-widget__button";
    button.textContent = "Add to cart";
    button.addEventListener("click", function () {
      var variantGid = resolveVariantId(container, bundle);
      if (!variantGid) {
        button.textContent = "Unavailable";
        return;
      }
      var instance = newInstanceId();
      var selectedBar = selected.current;
      var kind = selectedBar.kind || (type === "bogo" ? "bogo" : "product");
      var qty = selectedBar.minQuantity || 1;
      var items = [
        {
          id: numericVariantId(variantGid),
          quantity: kind === "bogo" ? selectedBar.buyQty || qty : qty,
          properties: lineProps(bundle, "trigger", {
            instance: instance,
            kind: kind,
          }),
        },
      ];
      if (kind === "bogo" || type === "bogo") {
        items.push({
          id: numericVariantId(variantGid),
          quantity: selectedBar.getQty || config.bogoGetQty || 1,
          properties: lineProps(bundle, "reward", {
            instance: instance,
            kind: "bogo",
          }),
        });
      }
      if (kind === "complete") {
        (selectedBar.products || []).forEach(function (product) {
          if (product.isDefault || !product.variantId) return;
          items.push({
            id: numericVariantId(product.variantId),
            quantity: product.quantity || 1,
            properties: lineProps(bundle, "addon", {
              instance: instance,
              kind: "complete",
            }),
          });
        });
      }
      if (selected.current.upsell && selected.current.upsell.variantId) {
        items.push({
          id: numericVariantId(selected.current.upsell.variantId),
          quantity: 1,
          properties: lineProps(bundle, "addon", { instance: instance }),
        });
      }
      var note = container.querySelector("[data-appify-note]");
      if (note && note.value) items[0].properties.Note = note.value;
      addItems(items, button).then(function () {
        trackEvent(analyticsUrl, bundle.id, "add_to_cart", {
          experimentId: bundle.experimentId,
          variantId: bundle.experimentVariant,
        });
      });
    });
    container.appendChild(button);
  }

  function renderPickerList(container, items, state, minItems) {
    var list = document.createElement("div");
    list.className = "appify-bundle-widget__items";
    items.forEach(function (item, index) {
      if (!state[index]) {
        state[index] = {
          qty: item.selectedByDefault || item.role === "required" ? item.quantity || 1 : 0,
          checked: item.role === "required" || item.selectedByDefault,
        };
      }
      var row = document.createElement("div");
      row.className = "appify-bundle-widget__item";
      var locked = item.role === "required";
      row.innerHTML =
        (item.imageUrl
          ? '<img class="appify-bundle-widget__item-img" src="' +
            item.imageUrl +
            '" alt="">'
          : '<span class="appify-bundle-widget__item-img"></span>') +
        '<span class="appify-bundle-widget__item-copy"><strong></strong><em></em></span>' +
        '<span class="appify-bundle-widget__item-qty"></span>';
      row.querySelector("strong").textContent = item.title || "Product";
      row.querySelector("em").textContent = item.role === "required" ? "Required" : "";
      var qtyBox = row.querySelector(".appify-bundle-widget__item-qty");
      if (locked) {
        qtyBox.textContent = "×" + (item.quantity || 1);
        state[index].qty = item.quantity || 1;
        state[index].checked = true;
      } else {
        var minus = document.createElement("button");
        minus.type = "button";
        minus.textContent = "−";
        var count = document.createElement("span");
        var plus = document.createElement("button");
        plus.type = "button";
        plus.textContent = "+";
        function refresh() {
          count.textContent = String(state[index].qty);
        }
        minus.addEventListener("click", function () {
          state[index].qty = Math.max(0, state[index].qty - 1);
          state[index].checked = state[index].qty > 0;
          refresh();
        });
        plus.addEventListener("click", function () {
          state[index].qty += 1;
          state[index].checked = true;
          refresh();
        });
        qtyBox.appendChild(minus);
        qtyBox.appendChild(count);
        qtyBox.appendChild(plus);
        refresh();
      }
      list.appendChild(row);
    });
    container.appendChild(list);
    if (minItems) {
      var hint = document.createElement("div");
      hint.className = "appify-bundle-widget__hint";
      hint.textContent = "Pick at least " + minItems + " items to unlock the deal.";
      container.appendChild(hint);
    }
  }

  function renderMixOrFixed(container, data, analyticsUrl, type) {
    var bundle = data.bundles[0];
    var config = bundle.config || {};
    var items = offerItems(bundle);
    var state = [];
    var title = document.createElement("div");
    title.className = "appify-bundle-widget__title";
    title.textContent = bundle.blockTitle || config.blockTitle || bundle.title;
    container.appendChild(title);
    renderCountdown(container, config.features);
    renderPickerList(container, items, state, type === "mix_match" ? config.minItems || 2 : 0);

    var button = document.createElement("button");
    button.type = "button";
    button.className = "appify-bundle-widget__button";
    button.textContent = type === "mix_match" ? "Add bundle" : "Add set to cart";
    button.addEventListener("click", function () {
      var instance = newInstanceId();
      var selected = items
        .map(function (item, index) {
          return { item: item, qty: state[index].qty };
        })
        .filter(function (row) {
          return row.qty > 0 && row.item.variantId;
        });
      if (type === "mix_match" && selected.length < (config.minItems || 2)) {
        button.textContent = "Pick more items";
        setTimeout(function () {
          button.textContent = "Add bundle";
        }, 1600);
        return;
      }
      if (type === "fixed_bundle") {
        var missing = items.some(function (item, index) {
          return item.role === "required" && state[index].qty < 1;
        });
        if (missing) return;
      }
      addItems(
        selected.map(function (row) {
          return {
            id: numericVariantId(row.item.variantId),
            quantity: row.qty,
            properties: lineProps(bundle, row.item.role || "pool", { instance: instance }),
          };
        }),
        button,
      ).then(function () {
        trackEvent(analyticsUrl, bundle.id, "add_to_cart", {
          experimentId: bundle.experimentId,
          variantId: bundle.experimentVariant,
        });
      });
    });
    container.appendChild(button);
  }

  function renderFbt(container, data, analyticsUrl) {
    var bundle = data.bundles[0];
    var config = bundle.config || {};
    var addons = offerItems(bundle).filter(function (item) {
      return item.role === "addon" || item.role === "optional";
    });
    var selected = addons.map(function () {
      return false;
    });
    var title = document.createElement("div");
    title.className = "appify-bundle-widget__title";
    title.textContent = bundle.blockTitle || "Frequently bought together";
    container.appendChild(title);

    var list = document.createElement("div");
    list.className = "appify-bundle-widget__items";
    addons.forEach(function (item, index) {
      var row = document.createElement("label");
      row.className = "appify-bundle-widget__item";
      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = selected[index];
      box.addEventListener("change", function () {
        selected[index] = box.checked;
        trackEvent(analyticsUrl, bundle.id, "click", {
          experimentId: bundle.experimentId,
          variantId: bundle.experimentVariant,
        });
      });
      row.appendChild(box);
      var copy = document.createElement("span");
      copy.className = "appify-bundle-widget__item-copy";
      copy.innerHTML = "<strong></strong>";
      copy.querySelector("strong").textContent = item.title || "Add-on";
      row.appendChild(copy);
      list.appendChild(row);
    });
    container.appendChild(list);

    var button = document.createElement("button");
    button.type = "button";
    button.className = "appify-bundle-widget__button";
    button.textContent = "Add selected";
    button.addEventListener("click", function () {
      var instance = newInstanceId();
      var trigger = resolveVariantId(container, bundle);
      var items = [];
      if (trigger) {
        items.push({
          id: numericVariantId(trigger),
          quantity: 1,
          properties: lineProps(bundle, "trigger", { instance: instance }),
        });
      }
      addons.forEach(function (item, index) {
        if (selected[index] && item.variantId) {
          items.push({
            id: numericVariantId(item.variantId),
            quantity: item.quantity || 1,
            properties: lineProps(bundle, "addon", { instance: instance }),
          });
        }
      });
      addItems(items, button).then(function () {
        trackEvent(analyticsUrl, bundle.id, "add_to_cart", {
          experimentId: bundle.experimentId,
          variantId: bundle.experimentVariant,
        });
      });
    });
    container.appendChild(button);
  }

  function renderGifts(container, data, analyticsUrl) {
    var bundle = data.bundles[0];
    var config = bundle.config || {};
    var title = document.createElement("div");
    title.className = "appify-bundle-widget__title";
    title.textContent = bundle.blockTitle || "Unlock free gifts";
    container.appendChild(title);
    fetch(cartRoot() + "cart.js", { credentials: "same-origin" })
      .then(function (res) {
        return res.json();
      })
      .then(function (cart) {
        var threshold = Number(config.giftThresholdValue || 50);
        var byQty = config.giftThresholdType === "quantity";
        var current = byQty
          ? cart.item_count
          : (cart.total_price || 0) / 100;
        var remaining = Math.max(0, threshold - current);
        var unlocked = remaining <= 0;
        renderProgress(
          container,
          unlocked
            ? config.giftFreeShipping
              ? "Free gift unlocked — free shipping too"
              : "Free gift unlocked"
            : byQty
              ? "Add " + remaining + " more items to unlock a gift"
              : "Add " + formatMoney(remaining * 100, container.dataset.currency) + " more to unlock a gift",
          threshold > 0 ? current / threshold : 1,
        );
        renderGiftChoices(container, bundle, cart, unlocked, analyticsUrl);
      })
      .catch(function () {
        renderProgress(container, "Add more to unlock a free gift", 0.2);
      });
  }

  function renderGiftChoices(container, bundle, cart, unlocked, analyticsUrl) {
    var gifts = offerItems(bundle).filter(function (item) {
      return item.role === "gift" && item.variantId;
    });
    if (!gifts.length) return;

    var existing = (cart.items || []).filter(function (item) {
      return item.properties && item.properties._appify_gift === "1";
    });
    var currency = container.dataset.currency;
    var pending = [];
    var list = document.createElement("div");
    list.className = "appify-bundle-widget__items";

    gifts.forEach(function (gift) {
      var already = existing.some(function (item) {
        return String(item.variant_id) === String(numericVariantId(gift.variantId));
      });
      if (!already) pending.push(gift);

      var row = document.createElement("div");
      row.className = "appify-bundle-widget__item";

      if (gift.imageUrl) {
        var img = document.createElement("img");
        img.className = "appify-bundle-widget__item-img";
        img.src = gift.imageUrl;
        img.alt = "";
        row.appendChild(img);
      }

      var copy = document.createElement("div");
      copy.className = "appify-bundle-widget__item-copy";
      var name = document.createElement("strong");
      name.textContent = gift.title || gift.productTitle || "Free gift";
      copy.appendChild(name);

      var price = document.createElement("div");
      price.className = "appify-bundle-widget__gift-price";
      var priceCents = Math.round((Number(gift.price) || 0) * 100);
      if (priceCents > 0) {
        var strike = document.createElement("span");
        strike.className = "appify-bundle-widget__strike";
        strike.textContent = formatMoney(priceCents, currency);
        price.appendChild(strike);
        price.appendChild(document.createTextNode(" "));
      }
      var free = document.createElement("span");
      free.textContent = already
        ? "Free · in your cart"
        : unlocked
          ? "Free if you add it"
          : "Free after you unlock and add it";
      price.appendChild(free);
      copy.appendChild(price);
      row.appendChild(copy);
      list.appendChild(row);
    });

    container.appendChild(list);

    if (!unlocked) {
      var locked = document.createElement("div");
      locked.className = "appify-bundle-widget__hint";
      locked.textContent =
        "Gifts stay out of your cart until you unlock the offer and tap Add free gift.";
      container.appendChild(locked);
      return;
    }

    if (!pending.length) {
      var added = document.createElement("div");
      added.className = "appify-bundle-widget__hint";
      added.textContent = "These free gifts are already in your cart.";
      container.appendChild(added);
      return;
    }

    var button = document.createElement("button");
    button.type = "button";
    button.className = "appify-bundle-widget__button";
    button.textContent =
      pending.length === 1
        ? "Add free gift"
        : "Add " + pending.length + " free gifts";
    button.addEventListener("click", function () {
      var instance = newInstanceId();
      addItems(
        pending.map(function (gift) {
          return {
            id: numericVariantId(gift.variantId),
            quantity: gift.quantity || 1,
            properties: lineProps(bundle, "gift", {
              instance: instance,
              gift: true,
            }),
          };
        }),
        button,
      ).then(function () {
        trackEvent(analyticsUrl, bundle.id, "add_to_cart", {
          experimentId: bundle.experimentId,
          variantId: bundle.experimentVariant,
        });
      });
    });
    container.appendChild(button);

    var consent = document.createElement("div");
    consent.className = "appify-bundle-widget__hint";
    consent.textContent =
      "These gifts are optional and free. Nothing is added until you tap the button.";
    container.appendChild(consent);
  }

  function renderWidget(container, data, analyticsUrl) {
    var bundle = data.bundles && data.bundles[0];
    if (!bundle) {
      container.innerHTML = "";
      container.style.display = "none";
      setThemePurchaseControlsHidden(false, container);
      return;
    }

    container.style.display = "";
    container.setAttribute("data-appify-bundle-id", bundle.id);
    var type = bundle.type || "quantity_break";
    setThemePurchaseControlsHidden(Boolean(HIDES_ATC[type]), container);
    applyStyles(container, data.widget, bundle.config);
    trackEvent(analyticsUrl, bundle.id, "view", {
      experimentId: bundle.experimentId,
      variantId: bundle.experimentVariant,
    });
    trackEvent(analyticsUrl, bundle.id, "impression", {
      experimentId: bundle.experimentId,
      variantId: bundle.experimentVariant,
    });

    container.innerHTML = "";
    applyCustomCss(container, bundle.config, bundle.id);

    if (type === "mix_match") {
      renderMixOrFixed(container, data, analyticsUrl, type);
    } else if (type === "fixed_bundle") {
      renderQuantityLike(container, data, analyticsUrl, type);
    } else if (type === "fbt_upsell") {
      renderFbt(container, data, analyticsUrl);
    } else if (type === "gifts") {
      renderGifts(container, data, analyticsUrl);
    } else {
      renderQuantityLike(container, data, analyticsUrl, type);
    }
  }

  function mountNearProductForm(el) {
    if (el.dataset.placement === "cart") return;
    var form = findProductForm(el);
    if (!form || form.contains(el)) return;
    var submitBtn =
      form.querySelector('[name="add"]') ||
      form.querySelector(".product-form__submit") ||
      form.querySelector('[type="submit"]');
    if (submitBtn && submitBtn.parentNode) {
      submitBtn.parentNode.insertBefore(el, submitBtn);
      return;
    }
    form.appendChild(el);
  }

  function hideWidget(el) {
    el.innerHTML = "";
    el.style.display = "none";
    setThemePurchaseControlsHidden(false, el);
  }

  function loadWidget(el) {
    var productId = el.dataset.productId;
    var proxyUrl = el.dataset.proxyUrl;
    var analyticsUrl = el.dataset.analyticsUrl;
    var placement = el.dataset.placement || "product";
    var collectionIds = el.dataset.collectionIds || "";
    if (!proxyUrl || (placement === "product" && !productId)) {
      hideWidget(el);
      return;
    }
    if (el.dataset.boundProductId === (productId || placement) && el.dataset.initialized === "true") {
      return;
    }

    el.dataset.boundProductId = productId || placement;
    el.dataset.initialized = "true";
    el.style.display = "none";
    el.innerHTML = "";
    mountNearProductForm(el);

    var controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      if (controller) controller.abort();
      hideWidget(el);
    }, FETCH_TIMEOUT_MS);

    var query =
      proxyUrl +
      "?placement=" +
      encodeURIComponent(placement) +
      (productId ? "&product_id=" + encodeURIComponent(productId) : "") +
      (collectionIds ? "&collection_ids=" + encodeURIComponent(collectionIds) : "");

    fetch(query, {
      credentials: "same-origin",
      signal: controller ? controller.signal : undefined,
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("proxy failed");
        return res.json();
      })
      .then(function (data) {
        if (timedOut) return;
        clearTimeout(timer);
        renderWidget(el, data, analyticsUrl);
      })
      .catch(function () {
        if (timedOut) return;
        clearTimeout(timer);
        hideWidget(el);
      });
  }

  function init() {
    document.querySelectorAll("[data-appify-bundle-widget]").forEach(loadWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  document.addEventListener("shopify:section:load", init);
})();

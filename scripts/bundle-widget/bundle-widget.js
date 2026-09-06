(function () {
  "use strict";

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

  function cx(name) {
    return "appify-bundle-widget__" + name;
  }

  function heading(container, text) {
    var title = document.createElement("div");
    title.className = cx("title");
    title.textContent = text;
    container.appendChild(title);
  }

  function actionButton(label) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = cx("button");
    button.textContent = label;
    return button;
  }

  function trackAdd(analyticsUrl, bundle) {
    trackEvent(analyticsUrl, bundle.id, "add_to_cart", {
      experimentId: bundle.experimentId,
      variantId: bundle.experimentVariant,
    });
  }

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
      sellingPlan: tier.applySellingPlan ? "Subscribe" : "",
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
      wrap.className += " " + cx("option-wrap--border");
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
    var hide = "data-appify-hidden-theme";
    var prev = "data-appify-prev-display";
    var form = findProductForm(el);
    var roots = [document];
    if (form) roots.unshift(form, form.parentElement || form);

    var seen = new Set();
    roots.forEach(function (root) {
      THEME_CONTROL_SELECTORS.forEach(function (sel) {
        root.querySelectorAll(sel).forEach(function (node) {
          if (seen.has(node) || (node.closest && node.closest("[data-appify-bundle-widget]"))) return;
          seen.add(node);
          if (hidden) {
            if (!node.hasAttribute(prev)) node.setAttribute(prev, node.style.display || "");
            node.setAttribute(hide, "true");
            node.style.setProperty("display", "none", "important");
            node.setAttribute("aria-hidden", "true");
          } else if (node.getAttribute(hide) === "true") {
            node.style.display = node.getAttribute(prev) || "";
            node.removeAttribute(hide);
            node.removeAttribute(prev);
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

  function parseJsonAttr(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function optionAxes(options) {
    return (options || []).filter(function (option) {
      var values = option.values || [];
      if (!option.name || !values.length) return false;
      return !(
        option.name === "Title" &&
        values.length === 1 &&
        values[0] === "Default Title"
      );
    });
  }

  function guessHandle(product) {
    if (product && product.handle) return product.handle;
    if (!product || !product.title) return "";
    return String(product.title)
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function availableValues(product, axisIndex, selected) {
    var variants = product.variants || [];
    var seen = [];
    variants.forEach(function (variant) {
      if (variant.available === false) return;
      var opts = variant.options || [];
      var matches = opts.every(function (value, index) {
        if (index === axisIndex) return true;
        return !selected[index] || selected[index] === value;
      });
      if (!matches) return;
      var value = opts[axisIndex];
      if (value && seen.indexOf(value) < 0) seen.push(value);
    });
    return seen;
  }

  function renderOptionSelects(host, product, state, requirePick, grouped, onChange) {
    var axes = optionAxes(product.options);
    if (grouped && axes.length) {
      var groupLabel = document.createElement("span");
      groupLabel.className = cx("variant-label");
      groupLabel.textContent = axes
        .map(function (axis) {
          return axis.name;
        })
        .join(", ");
      host.appendChild(groupLabel);
    }
    axes.forEach(function (axis, index) {
      var values = (product.variants || []).length
        ? availableValues(product, index, state)
        : axis.values || [];
      if (!values.length) return;
      if (state[index] && values.indexOf(state[index]) < 0) state[index] = "";
      var field = document.createElement("label");
      field.className = cx("variant-field");
      if (!grouped) {
        var name = document.createElement("span");
        name.textContent = axis.name;
        field.appendChild(name);
      }
      var select = document.createElement("select");
      select.className = cx("variant-select");
      if (requirePick && !state[index]) {
        var blank = document.createElement("option");
        blank.value = "";
        blank.textContent = "Select " + axis.name;
        select.appendChild(blank);
      }
      values.forEach(function (value) {
        var opt = document.createElement("option");
        opt.value = value;
        opt.textContent = value;
        if (state[index] === value) opt.selected = true;
        select.appendChild(opt);
      });
      if (!requirePick && !state[index] && values[0]) state[index] = values[0];
      select.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      select.addEventListener("change", function (event) {
        event.stopPropagation();
        state[index] = select.value;
        if (onChange) onChange();
      });
      field.appendChild(select);
      host.appendChild(field);
    });
  }

  function pageProductModel(container) {
    return {
      id: container.dataset.productId,
      handle: container.dataset.productHandle,
      title: container.dataset.productTitle,
      variantId: container.dataset.variantId,
      options: parseJsonAttr(container.dataset.productOptions) || [],
      variants: parseJsonAttr(container.dataset.productVariants) || [],
    };
  }

  function normalizeProductJson(raw) {
    var options = [];
    if (raw.options && raw.options[0] && raw.options[0].name) {
      options = raw.options.map(function (option) {
        return { name: option.name, values: option.values || [] };
      });
    } else {
      options = (raw.options || []).map(function (name, index) {
        var values = [];
        (raw.variants || []).forEach(function (variant) {
          var value = variant["option" + (index + 1)];
          if (value && values.indexOf(value) < 0) values.push(value);
        });
        return { name: name, values: values };
      });
    }
    return {
      handle: raw.handle,
      options: options,
      variants: (raw.variants || []).map(function (variant) {
        return {
          id: variant.id,
          available: variant.available !== false,
          options:
            variant.options ||
            [variant.option1, variant.option2, variant.option3].filter(Boolean),
        };
      }),
    };
  }

  var productJsonCache = {};

  function loadProductJson(handle) {
    if (!handle) return Promise.resolve(null);
    if (productJsonCache[handle]) return productJsonCache[handle];
    productJsonCache[handle] = fetch("/products/" + encodeURIComponent(handle) + ".js", {
      credentials: "same-origin",
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .catch(function () {
        return null;
      });
    return productJsonCache[handle];
  }

  function ensureProductModel(product) {
    if (!product) return Promise.resolve(null);
    var handle = guessHandle(product);
    if (!handle) return Promise.resolve(product);
    return loadProductJson(handle).then(function (raw) {
      return raw ? Object.assign({}, product, normalizeProductJson(raw)) : product;
    });
  }

  function findVariantByOptions(variants, selected) {
    var values = selected || [];
    if (!values.length || values.some(function (value) { return !value; })) return null;
    var match = (variants || []).find(function (variant) {
      if (variant.available === false) return false;
      var opts = variant.options || [];
      return (
        opts.length === values.length &&
        values.every(function (value, index) {
          return opts[index] === value;
        })
      );
    });
    return match ? match.id : null;
  }

  function pickedVariantId(product, selected, fallbackId) {
    return optionAxes(product && product.options).length
      ? findVariantByOptions(product.variants, selected) || fallbackId
      : fallbackId;
  }

  function selectedFromVariant(product) {
    var current = (product.variants || []).find(function (variant) {
      return (
        variant.available !== false &&
        String(variant.id) === String(product.variantId || "")
      );
    });
    if (!current) {
      current = (product.variants || []).find(function (variant) {
        return variant.available !== false;
      });
    }
    return current ? (current.options || []).slice() : [];
  }

  function newInstanceId() {
    return "ab-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function cartRoot() {
    return (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";
  }

  function sectionIds(node) {
    if (node && typeof node.getSectionsToRender === "function") {
      try {
        return node.getSectionsToRender().map(function (section) {
          return section.id;
        });
      } catch (e) {}
    }
  }

  function getDawnCartSections() {
    var drawer = document.querySelector("cart-drawer");
    var ids = sectionIds(drawer);
    if (ids) return ids;
    var notification = document.querySelector("cart-notification");
    ids = sectionIds(notification);
    if (ids) return ids;
    if (drawer) return ["cart-drawer", "cart-icon-bubble"];
    if (notification) {
      return ["cart-notification", "cart-notification-product", "cart-notification-button", "cart-icon-bubble"];
    }
    return ["cart-icon-bubble"];
  }

  function isThemeDrawerSectionHtml(html) {
    return !!html && (html.indexOf("drawer__inner") !== -1 || html.indexOf("cart-drawer-items") !== -1 ||
      (html.indexOf("Continue shopping") === -1 && html.indexOf("title--primary") === -1 &&
        (html.indexOf("cart-drawer") !== -1 || html.indexOf("CartDrawer") !== -1)));
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

  function setVars(root, src, pairs) {
    for (var i = 0; i < pairs.length; i += 2) {
      if (src[pairs[i]]) root.style.setProperty(pairs[i + 1], src[pairs[i]]);
    }
  }

  function applyStyles(root, widget, config) {
    if (widget) {
      setVars(root, widget, [
        "primaryColor", "--ab-primary",
        "backgroundColor", "--ab-bg",
        "textColor", "--ab-text",
        "borderColor", "--ab-border",
        "selectedBorderColor", "--ab-selected",
        "badgeColor", "--ab-badge",
        "badgeTextColor", "--ab-badge-text",
        "secondaryColor", "--ab-secondary",
      ]);
    }
    if (config && config.style) {
      var s = config.style;
      root.className = root.className
        .replace(/appify-bundle-widget--(vertical|horizontal|compact|minimal)/g, "")
        .trim();
      root.classList.add("appify-bundle-widget--" + (s.layout || "vertical"));
      setVars(root, s, [
        "cardsBg", "--ab-bg",
        "selectedBg", "--ab-secondary",
        "inactiveText", "--ab-inactive-text",
        "buttonBg", "--ab-primary",
        "buttonText", "--ab-button-text",
        "borderColor", "--ab-border",
        "titleColor", "--ab-text",
        "subtitleColor", "--ab-muted",
        "priceColor", "--ab-price",
        "fullPriceColor", "--ab-compare",
        "blockTitleColor", "--ab-block-title",
        "badgeBg", "--ab-badge",
        "badgeText", "--ab-badge-text",
      ]);
      if (s.cornerRadius != null) root.style.setProperty("--ab-radius", s.cornerRadius + "px");
      if (s.spacing != null) root.style.setProperty("--ab-spacing", s.spacing + "px");
      if (s.blockTitleSize) root.style.setProperty("--ab-block-title-size", s.blockTitleSize + "px");
      if (s.titleSize) root.style.setProperty("--ab-title-size", s.titleSize + "px");
      if (s.subtitleSize) root.style.setProperty("--ab-subtitle-size", s.subtitleSize + "px");
    }
  }

  function applyCustomCss(root, config) {
    if (!config || !config.style) return;
    var s = config.style;
    if (!s.customCssEnabled || !s.customCss) return;
    var existing = root.querySelector('[data-appify-custom-css="true"]');
    if (existing) existing.remove();
    var styleEl = document.createElement("style");
    styleEl.setAttribute("data-appify-custom-css", "true");
    styleEl.textContent = s.customCss;
    root.appendChild(styleEl);
  }

  function buildTiers(bundle) {
    var bars = (bundle.config || {}).bars;
    if (bars && bars.length) {
      bars.forEach(function (bar) {
        bar.minQuantity = bar.quantity;
        bar.kind = bar.kind || "product";
        if (bar.priceType === "full") bar.discountValue = 0;
        bar.discountType =
          bar.priceType === "flat" ? "flat" : bar.priceType === "fixed" ? "fixed" : "percentage";
        bar.labelText = bar.label;
        bar.label = bar.title;
      });
      return bars;
    }
    return bundle.tiers && bundle.tiers.length
      ? bundle.tiers
      : [{ minQuantity: 1, discountValue: 0, discountType: "percentage", label: "Single", subtitle: "Standard price" }];
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
    el.className = cx("countdown");
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
    wrap.className = cx("progress");
    wrap.innerHTML =
      '<div class="'+cx("progress-label")+'"></div>' +
      '<div class="'+cx("progress-track")+'"><div class="'+cx("progress-fill")+'"></div></div>';
    wrap.querySelector("." + cx("progress-label")).textContent = text;
    wrap.querySelector("." + cx("progress-fill")).style.width =
      Math.max(0, Math.min(100, ratio * 100)) + "%";
    container.appendChild(wrap);
  }

  function renderBarExtras(option, tier) {
    if (tier.highlights && tier.highlights.items && tier.highlights.items.length) {
      var list = document.createElement("ul");
      list.className = cx("highlights");
      tier.highlights.items.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item.text;
        list.appendChild(li);
      });
      option.appendChild(list);
    }
    if (tier.personalisation) {
      var field = document.createElement("input");
      field.className = cx("note");
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
        slot: "page",
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
        slot: item.id,
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
        slot: "",
        title: "Recommended",
        imageUrl: "",
        compare: recCompare,
        sale: applyPriceCents(recSale, tier.priceType, tier.discountValue),
      });
    }
    var layout = tier.completeLayout === "stack" ? " " + cx("complete--stack") : "";
    var html = '<span class="'+cx("complete")+layout+'">';
    cards.forEach(function (card, index) {
      html +=
        '<span class="'+cx("complete-item")+'">' +
        (index > 0 ? '<span class="'+cx("complete-plus")+'">+</span>' : "") +
        (card.imageUrl
          ? '<img src="' + card.imageUrl + '" alt="">'
          : '<span class="'+cx("complete-ph")+'"></span>') +
        '<span class="'+cx("complete-copy")+'">' +
        '<span class="'+cx("complete-title")+'"></span>' +
        (card.slot
          ? '<span class="'+cx("complete-pickers")+'" data-picker-slot="'+card.slot+'"></span>'
          : "") +
        "</span>" +
        '<span class="'+cx("complete-price")+'"><strong>' +
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
    wrap.querySelectorAll("." + cx("complete-title")).forEach(function (node, i) {
      node.textContent = cards[i].title;
    });
    return wrap.innerHTML;
  }

  function renderTierOptions(container, bundle, tiers, saleCents, compareCents, useCompareAtPrice, currency, onSelect, productTitle) {
    var optionsEl = document.createElement("div");
    optionsEl.className = cx("options");
    optionsEl.setAttribute("role", "radiogroup");
    var selectedIndex = tiers.findIndex(function (t) {
      return t.selectedByDefault;
    });
    if (selectedIndex < 0) selectedIndex = Math.min(1, tiers.length - 1);

    tiers.forEach(function (tier, index) {
      var pricing = calculateTierPricing(tier, saleCents, compareCents, useCompareAtPrice);
      var extras = textExtras(tier);
      var wrap = document.createElement("div");
      wrap.className = cx("option-wrap");
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
      var option = document.createElement("div");
      option.setAttribute("role", "radio");
      option.setAttribute("tabindex", tier.soldOut ? "-1" : "0");
      option.setAttribute("aria-checked", index === selectedIndex ? "true" : "false");
      option.className =
        cx("option") +
        (index === selectedIndex ? " " + cx("option--selected") : "");
      if (tier.soldOut) option.setAttribute("aria-disabled", "true");
      var title = interpolateText(tier.label, productTitle, pricing, currency, extras);
      var subtitle = interpolateText(tier.subtitle, productTitle, pricing, currency, extras);
      var badge =
        (tier.badgeText && String(tier.badgeText).trim()) ||
        interpolateText(tier.labelText, productTitle, pricing, currency, extras) ||
        (tier.kind === "complete" ? "" : savingsBadge(pricing, currency));
      var priceHtml =
        pricing.savings > 0
          ? '<span class="'+cx("price-compare")+'">' +
            formatMoney(pricing.compareTotal, currency) +
            '</span><span class="'+cx("price-sale")+'">' +
            formatMoney(pricing.saleTotal, currency) +
            "</span>"
          : '<span class="'+cx("price-sale")+'">' +
            formatMoney(pricing.saleTotal, currency) +
            "</span>";
      option.innerHTML =
        '<span class="'+cx("option-top")+'">' +
        '<span class="'+cx("radio")+'"></span>' +
        '<span class="'+cx("option-intro")+'">' +
        '<span class="'+cx("option-header")+'">' +
        '<span class="'+cx("option-label")+'">' +
        (title || tier.minQuantity + " pack") +
        '</span><span class="'+cx("option-prices")+'">' +
        priceHtml +
        "</span></span>" +
        (subtitle
          ? '<span class="'+cx("option-sub")+'">' +
            subtitle +
            "</span>"
          : "") +
        "</span></span>" +
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
          : '<span class="'+cx("option-pickers")+'" data-picker-slot="page"></span>') +
        (badge
          ? '<span class="'+cx("badge")+'">' + badge + "</span>"
          : "");
      renderBarExtras(option, tier);
      function chooseTier(event) {
        if (tier.soldOut) return;
        if (event && event.target && event.target.closest("select, input, textarea, label")) {
          return;
        }
        selectedIndex = index;
        optionsEl.querySelectorAll("." + cx("option")).forEach(function (node, i) {
          node.classList.toggle(cx("option--selected"), i === index);
          node.setAttribute("aria-checked", i === index ? "true" : "false");
        });
        onSelect(tiers[index]);
      }
      option.addEventListener("click", chooseTier);
      option.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          chooseTier(event);
        }
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

    heading(container, bundle.blockTitle || config.blockTitle || bundle.title);
    renderCountdown(container, config.features);
    var upsellState = { accepted: false };
    var upsellHost = document.createElement("div");
    upsellHost.className = cx("upsell-host");

    function refreshUpsell(tier) {
      upsellHost.textContent = "";
      upsellState.accepted = false;
      var upsell = tier && tier.upsell;
      if (!upsell || !upsell.variantId) return;

      var row = document.createElement("label");
      row.className = cx("upsell");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = false;
      box.addEventListener("change", function () {
        upsellState.accepted = box.checked;
      });
      row.appendChild(box);
      if (upsell.imageUrl) {
        var img = document.createElement("img");
        img.src = upsell.imageUrl;
        img.alt = "";
        row.appendChild(img);
      }
      var copy = document.createElement("span");
      copy.className = cx("item-copy");
      copy.innerHTML = "<strong></strong><em></em>";
      copy.querySelector("strong").textContent =
        upsell.text || upsell.productTitle || "Add this item";
      copy.querySelector("em").textContent =
        "Optional";
      row.appendChild(copy);
      upsellHost.appendChild(row);
    }

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
        refreshUpsell(tier);
        refreshPickers(tier);
        trackEvent(analyticsUrl, bundle.id, "click", {
          experimentId: bundle.experimentId,
          variantId: bundle.experimentVariant,
        });
      },
      container.dataset.productTitle || "",
    );
    refreshUpsell(selected.current);

    var pickerState = { page: [], qty: {}, models: {} };
    var pickerGen = 0;

    function renderQtyField(host, key) {
      if (pickerState.qty[key] == null) pickerState.qty[key] = 1;
      var field = document.createElement("label");
      field.className = cx("variant-field");
      var name = document.createElement("span");
      name.textContent = "Quantity";
      var input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.className = cx("variant-select");
      input.value = String(pickerState.qty[key]);
      input.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      input.addEventListener("change", function (event) {
        event.stopPropagation();
        pickerState.qty[key] = Math.max(1, parseInt(input.value, 10) || 1);
        input.value = String(pickerState.qty[key]);
      });
      field.appendChild(name);
      field.appendChild(input);
      host.appendChild(field);
    }

    function appendPickerTo(slot, model, stateKey, requirePick, showQty, compact) {
      if (!slot) return;
      slot.innerHTML = "";
      if (!optionAxes(model.options).length && !showQty) return;
      if (!pickerState[stateKey]) pickerState[stateKey] = [];
      if (!requirePick && !pickerState[stateKey].length) {
        pickerState[stateKey] = selectedFromVariant(model);
      }
      var group = document.createElement("div");
      group.className = cx("variant-group") + (compact ? " " + cx("variant-group--compact") : "");
      function draw() {
        group.innerHTML = "";
        renderOptionSelects(group, model, pickerState[stateKey], requirePick, true, draw);
        if (showQty) renderQtyField(group, stateKey);
      }
      draw();
      slot.appendChild(group);
    }

    function refreshPickers(tier) {
      var gen = ++pickerGen;
      container.querySelectorAll("[data-picker-slot]").forEach(function (slot) {
        slot.innerHTML = "";
      });
      var selectedEl = container.querySelector("." + cx("option--selected"));
      if (!selectedEl || !tier) return;
      var requirePick = !!tier.requireVariantSelection;
      var showQty = !!tier.showQuantitySelector;
      var pageModel = pageProductModel(container);
      pickerState.models.page = pageModel;
      var pageSlot = selectedEl.querySelector('[data-picker-slot="page"]');
      appendPickerTo(pageSlot, pageModel, "page", requirePick, showQty, tier.kind !== "complete");
      ensureProductModel(pageModel).then(function (model) {
        if (gen !== pickerGen || !model) return;
        pickerState.models.page = model;
        if (optionAxes(model.options).length || showQty) {
          appendPickerTo(pageSlot, model, "page", requirePick, showQty, tier.kind !== "complete");
        }
      });
      if (tier.kind !== "complete") return;
      (tier.products || []).forEach(function (product) {
        if (product.isDefault) return;
        ensureProductModel(product).then(function (model) {
          if (gen !== pickerGen || !model) return;
          pickerState.models[product.id] = model;
          appendPickerTo(
            selectedEl.querySelector('[data-picker-slot="' + product.id + '"]'),
            model,
            product.id,
            requirePick,
            showQty,
            false,
          );
        });
      });
    }

    refreshPickers(selected.current);

    var next = tiers.find(function (tier) {
      return tier.minQuantity > (selected.current.minQuantity || 1);
    });
    if (next) {
      renderProgress(
        container,
        "Add " +
          (next.minQuantity - (selected.current.minQuantity || 1)) +
          " more",
        (selected.current.minQuantity || 1) / next.minQuantity,
      );
    }

    var button = actionButton("Add to cart");
    button.addEventListener("click", function () {
      var selectedBar = selected.current;
      var pageModel = pickerState.models.page || pageProductModel(container);
      var pickedPageId =
        optionAxes(pageModel.options).length
          ? findVariantByOptions(pageModel.variants, pickerState.page)
          : resolveVariantId(container, bundle);
      if (selectedBar && selectedBar.requireVariantSelection) {
        var pageReady = !optionAxes(pageModel.options).length || pickedPageId;
        var extrasReady = ((selectedBar.products || [])).filter(function (product) {
          return !product.isDefault;
        }).every(function (product) {
          var model = pickerState.models[product.id] || product;
          return (
            !optionAxes(model.options).length ||
            findVariantByOptions(model.variants, pickerState[product.id] || [])
          );
        });
        if (!pageReady || !extrasReady) {
          button.textContent = "Select variants";
          setTimeout(function () {
            button.textContent = "Add to cart";
          }, 1400);
          return;
        }
      }
      var variantGid = pickedPageId || resolveVariantId(container, bundle);
      if (!variantGid) {
        button.textContent = "Unavailable";
        return;
      }
      var instance = newInstanceId();
      var kind = selectedBar.kind || (type === "bogo" ? "bogo" : "product");
      var qty =
        (selectedBar.showQuantitySelector && pickerState.qty.page) ||
        selectedBar.minQuantity ||
        1;
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
          if (product.isDefault) return;
          var model = pickerState.models[product.id] || product;
          var pickedId =
            optionAxes(model.options).length
              ? findVariantByOptions(model.variants, pickerState[product.id] || [])
              : product.variantId;
          if (!pickedId) return;
          items.push({
            id: numericVariantId(pickedId),
            quantity:
              (selectedBar.showQuantitySelector && pickerState.qty[product.id]) ||
              product.quantity ||
              1,
            properties: lineProps(bundle, "addon", {
              instance: instance,
              kind: "complete",
            }),
          });
        });
      }
      if (
        upsellState.accepted &&
        selected.current.upsell &&
        selected.current.upsell.variantId
      ) {
        items.push({
          id: numericVariantId(selected.current.upsell.variantId),
          quantity: 1,
          properties: lineProps(bundle, "addon", { instance: instance }),
        });
      }
      var note = container.querySelector("[data-appify-note]");
      if (note && note.value) items[0].properties.Note = note.value;
      addItems(items, button).then(function () {
        trackAdd(analyticsUrl, bundle);
      });
    });
    container.appendChild(upsellHost);
    container.appendChild(button);
  }

  function renderPickerList(container, items, state, minItems, requirePick) {
    var list = document.createElement("div");
    list.className = cx("items");
    items.forEach(function (item, index) {
      if (!state[index]) {
        state[index] = {
          qty: item.selectedByDefault || item.role === "required" ? item.quantity || 1 : 0,
          checked: item.role === "required" || item.selectedByDefault,
          options: [],
          model: item,
        };
      }
      var row = document.createElement("div");
      row.className = cx("item");
      var locked = item.role === "required";
      row.innerHTML =
        (item.imageUrl
          ? '<img class="'+cx("item-img")+'" src="' +
            item.imageUrl +
            '" alt="">'
          : '<span class="'+cx("item-img")+'"></span>') +
        '<span class="'+cx("item-copy")+'"><strong></strong><em></em></span>' +
        '<span class="'+cx("item-qty")+'"></span>';
      row.querySelector("strong").textContent = item.title || "Product";
      row.querySelector("em").textContent = item.role === "required" ? "Required" : "";
      var variantBox = document.createElement("div");
      variantBox.className = cx("variant-group");
      row.querySelector("." + cx("item-copy")).appendChild(variantBox);
      ensureProductModel(item).then(function (model) {
        if (!model) return;
        state[index].model = model;
        if (!requirePick && !state[index].options.length) {
          state[index].options = selectedFromVariant(model);
        }
        renderOptionSelects(variantBox, model, state[index].options, !!requirePick);
      });
      var qtyBox = row.querySelector("." + cx("item-qty"));
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
      hint.className = cx("hint");
      hint.textContent = "Pick at least " + minItems + " items";
      container.appendChild(hint);
    }
  }

  function renderMixOrFixed(container, data, analyticsUrl) {
    var bundle = data.bundles[0];
    var config = bundle.config || {};
    var items = offerItems(bundle);
    var state = [];
    heading(container, bundle.blockTitle || config.blockTitle || bundle.title);
    renderCountdown(container, config.features);
    var requirePick = !(config.settings && config.settings.variantSelection === false);
    renderPickerList(container, items, state, config.minItems || 2, requirePick);

    var button = actionButton("Add bundle");
    button.addEventListener("click", function () {
      var instance = newInstanceId();
      var selected = items
        .map(function (item, index) {
          var model = state[index].model || item;
          return {
            item: item,
            qty: state[index].qty,
            variantId: pickedVariantId(model, state[index].options, item.variantId),
          };
        })
        .filter(function (row) {
          return row.qty > 0 && row.variantId;
        });
      if (requirePick && items.some(function (item, index) {
        return state[index].qty > 0 && optionAxes((state[index].model || item).options).length &&
          !findVariantByOptions((state[index].model || item).variants, state[index].options);
      })) {
        button.textContent = "Select variants";
        setTimeout(function () {
          button.textContent = "Add bundle";
        }, 1400);
        return;
      }
      if (selected.length < (config.minItems || 2)) {
        button.textContent = "Pick more items";
        setTimeout(function () {
          button.textContent = "Add bundle";
        }, 1600);
        return;
      }
      addItems(
        selected.map(function (row) {
          return {
            id: numericVariantId(row.variantId),
            quantity: row.qty,
            properties: lineProps(bundle, row.item.role || "pool", { instance: instance }),
          };
        }),
        button,
      ).then(function () {
        trackAdd(analyticsUrl, bundle);
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
      return { checked: false, options: [], model: null };
    });
    var requirePick = !(config.settings && config.settings.variantSelection === false);
    heading(container, bundle.blockTitle || "Frequently bought together");

    var list = document.createElement("div");
    list.className = cx("items");
    addons.forEach(function (item, index) {
      var row = document.createElement("div");
      row.className = cx("item");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = selected[index].checked;
      box.addEventListener("change", function () {
        selected[index].checked = box.checked;
        trackEvent(analyticsUrl, bundle.id, "click", {
          experimentId: bundle.experimentId,
          variantId: bundle.experimentVariant,
        });
      });
      row.appendChild(box);
      var copy = document.createElement("span");
      copy.className = cx("item-copy");
      copy.innerHTML = "<strong></strong>";
      copy.querySelector("strong").textContent = item.title || "Add-on";
      var variantBox = document.createElement("div");
      variantBox.className = cx("variant-group");
      copy.appendChild(variantBox);
      row.appendChild(copy);
      ensureProductModel(item).then(function (model) {
        if (!model) return;
        selected[index].model = model;
        if (!requirePick && !selected[index].options.length) {
          selected[index].options = selectedFromVariant(model);
        }
        renderOptionSelects(variantBox, model, selected[index].options, requirePick);
      });
      list.appendChild(row);
    });
    container.appendChild(list);

    var button = actionButton("Add selected");
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
      var missing = addons.some(function (item, index) {
        if (!selected[index].checked) return false;
        var model = selected[index].model || item;
        return optionAxes(model.options).length &&
          !findVariantByOptions(model.variants, selected[index].options);
      });
      if (requirePick && missing) {
        button.textContent = "Select variants";
        setTimeout(function () {
          button.textContent = "Add selected";
        }, 1400);
        return;
      }
      addons.forEach(function (item, index) {
        if (!selected[index].checked) return;
        var model = selected[index].model || item;
        var variantId = pickedVariantId(model, selected[index].options, item.variantId);
        if (!variantId) return;
        items.push({
          id: numericVariantId(variantId),
          quantity: item.quantity || 1,
          properties: lineProps(bundle, "addon", { instance: instance }),
        });
      });
      addItems(items, button).then(function () {
        trackAdd(analyticsUrl, bundle);
      });
    });
    container.appendChild(button);
  }

  function renderGifts(container, data, analyticsUrl) {
    var bundle = data.bundles[0];
    var config = bundle.config || {};
    heading(container, bundle.blockTitle || "Unlock free gifts");
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
            ? "Gift unlocked"
            : byQty
              ? "Add " + remaining + " more items"
              : "Add " + formatMoney(remaining * 100, container.dataset.currency) + " more",
          threshold > 0 ? current / threshold : 1,
        );
        renderGiftChoices(container, bundle, cart, unlocked, analyticsUrl);
      })
      .catch(function () {
        renderProgress(container, "Add more to unlock", 0.2);
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
    list.className = cx("items");

    gifts.forEach(function (gift) {
      var already = existing.some(function (item) {
        return String(item.variant_id) === String(numericVariantId(gift.variantId));
      });
      if (!already) pending.push(gift);

      var row = document.createElement("div");
      row.className = cx("item");

      if (gift.imageUrl) {
        var img = document.createElement("img");
        img.className = cx("item-img");
        img.src = gift.imageUrl;
        img.alt = "";
        row.appendChild(img);
      }

      var copy = document.createElement("div");
      copy.className = cx("item-copy");
      var name = document.createElement("strong");
      name.textContent = gift.title || gift.productTitle || "Free gift";
      copy.appendChild(name);

      var price = document.createElement("div");
      price.className = cx("gift-price");
      var priceCents = Math.round((Number(gift.price) || 0) * 100);
      if (priceCents > 0) {
        var strike = document.createElement("span");
        strike.className = cx("strike");
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
      locked.className = cx("hint");
      locked.textContent =
        "Unlock the offer, then tap Add free gift.";
      container.appendChild(locked);
      return;
    }

    if (!pending.length) {
      var added = document.createElement("div");
      added.className = cx("hint");
      added.textContent = "Gifts are already in your cart.";
      container.appendChild(added);
      return;
    }

    var button = actionButton(
      pending.length === 1
        ? "Add free gift"
        : "Add " + pending.length + " free gifts",
    );
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
        trackAdd(analyticsUrl, bundle);
      });
    });
    container.appendChild(button);

    var consent = document.createElement("div");
    consent.className = cx("hint");
    consent.textContent =
      "Optional and free. Nothing is added until you tap the button.";
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
    var meta = {
      experimentId: bundle.experimentId,
      variantId: bundle.experimentVariant,
    };
    trackEvent(analyticsUrl, bundle.id, "view", meta);
    trackEvent(analyticsUrl, bundle.id, "impression", meta);

    container.innerHTML = "";
    applyCustomCss(container, bundle.config);

    if (type === "mix_match") renderMixOrFixed(container, data, analyticsUrl);
    else if (type === "fbt_upsell") renderFbt(container, data, analyticsUrl);
    else if (type === "gifts") renderGifts(container, data, analyticsUrl);
    else renderQuantityLike(container, data, analyticsUrl, type);
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

    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, 10000);

    var query =
      proxyUrl +
      "?placement=" +
      encodeURIComponent(placement) +
      (productId ? "&product_id=" + encodeURIComponent(productId) : "") +
      (collectionIds ? "&collection_ids=" + encodeURIComponent(collectionIds) : "");

    fetch(query, {
      credentials: "same-origin",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(function (res) {
        if (!res.ok) throw new Error("x");
        return res.json();
      })
      .then(function (data) {
        clearTimeout(timer);
        renderWidget(el, data, analyticsUrl);
      })
      .catch(function () {
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

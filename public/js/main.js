(() => {
  document.body.classList.add("is-loading");

  const preloader = document.querySelector("#preloader");
  const hidePreloader = () => {
    if (!preloader) return;
    preloader.classList.add("is-done");
    preloader.setAttribute("aria-busy", "false");
    document.body.classList.remove("is-loading");
    window.setTimeout(() => preloader.remove(), 600);
  };

  const minShow = 650;
  const started = performance.now();
  const finish = () => {
    const wait = Math.max(0, minShow - (performance.now() - started));
    window.setTimeout(hidePreloader, wait);
  };

  if (document.readyState === "complete") {
    finish();
  } else {
    window.addEventListener("load", finish, { once: true });
  }

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  const year = document.querySelector("#year");
  const form = document.querySelector("#quote-form");
  const status = document.querySelector("#form-status");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  const onScroll = () => {
    if (!header || header.classList.contains("site-header--solid")) return;
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -30px 0px" },
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  const modeImages = {
    plane: "/assets/img/plane.jpg",
    ship: "/assets/img/ship.jpg",
    train: "/assets/img/ttt.png",
    truck: "/assets/img/b.png",
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return String(iso);
      // Date-only values (yyyy-mm-dd) keep calendar formatting;
      // full ISO timestamps show real date + time from edits.
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) {
        return date.toLocaleDateString(undefined, { dateStyle: "medium" });
      }
      return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const bindTrackForm = (trackForm) => {
    const trackStatus = trackForm.querySelector(".js-track-status");
    if (!trackStatus) return;

    trackForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      trackStatus.className = "form-status js-track-status";
      if (trackForm.classList.contains("hero-track")) {
        trackStatus.classList.add("hero-track__status");
      }
      trackStatus.textContent = "Looking up shipment…";

      const data = new FormData(trackForm);
      const code = String(data.get("code") || "").trim();
      if (!code) {
        trackStatus.classList.add("is-error");
        trackStatus.textContent = "Enter a tracking code.";
        return;
      }

      const shouldRedirect = trackForm.dataset.redirect === "true";
      if (shouldRedirect) {
        window.location.href = `/package.html?code=${encodeURIComponent(code)}`;
        return;
      }

      try {
        const response = await fetch(`/api/track/${encodeURIComponent(code)}`);
        const result = await response.json();
        if (!response.ok) {
          const message = Array.isArray(result.message)
            ? result.message.join(" ")
            : result.message || "Shipment not found.";
          throw new Error(message);
        }
        trackStatus.classList.add("is-success");
        trackStatus.textContent = `${result.status}: ${result.origin} → ${result.destination}`;
      } catch (error) {
        trackStatus.classList.add("is-error");
        trackStatus.textContent =
          error instanceof Error
            ? error.message
            : "Unable to track that code right now.";
      }
    });
  };

  document.querySelectorAll(".js-track-form").forEach(bindTrackForm);

  // Package detail page
  const packageView = document.querySelector("#package-view");
  if (packageView) {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get("code") || "").trim();
    const loading = document.querySelector("#package-loading");
    const errorBox = document.querySelector("#package-error");
    const errorMsg = document.querySelector("#package-error-msg");
    const subtitle = document.querySelector("#package-subtitle");

    const showError = (message) => {
      if (loading) loading.hidden = true;
      if (errorBox) errorBox.hidden = false;
      if (errorMsg) errorMsg.textContent = message;
      if (subtitle) subtitle.textContent = "We could not locate that shipment.";
    };

    const setText = (id, value) => {
      const el = document.querySelector(id);
      if (el) el.textContent = value || "—";
    };

    if (!code) {
      showError("No tracking code provided. Go back and enter a code.");
    } else {
      fetch(`/api/track/${encodeURIComponent(code)}`)
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) {
            throw new Error(
              Array.isArray(result.message)
                ? result.message.join(" ")
                : result.message || "Shipment not found.",
            );
          }
          return result;
        })
        .then((result) => {
          if (loading) loading.hidden = true;
          packageView.hidden = false;
          if (subtitle) {
            subtitle.textContent = `${result.origin} → ${result.destination}`;
          }

          setText("#pkg-status-level", result.statusLevel);
          setText("#pkg-code", result.code);
          setText("#pkg-delivery-status", result.status);
          setText("#pkg-eta", formatDate(result.estimatedDelivery));
          setText("#pkg-current", result.currentLocation);
          setText("#pkg-amount", result.amountPaid);
          setText("#pkg-sender-name", result.sender?.name);
          setText("#pkg-sender-address", result.sender?.address);
          setText("#pkg-sender-email", result.sender?.email);
          setText("#pkg-receiver-name", result.receiver?.name);
          setText("#pkg-receiver-address", result.receiver?.address);
          setText("#pkg-receiver-email", result.receiver?.email);
          setText("#pkg-parcel", result.parcelDetails);
          setText("#pkg-weight", result.weight);
          setText("#pkg-destination", result.destination);
          setText("#pkg-departure-city", result.origin);
          setText("#pkg-departure-date", formatDate(result.dateOfDeparture));
          setText("#pkg-eta-full", formatDate(result.estimatedDelivery));
          setText("#pkg-current-full", result.currentLocation);
          setText("#pkg-delivery-full", result.status);
          setText("#pkg-level-full", result.statusLevel);
          setText("#pkg-history-notes", result.shipmentHistory || "—");
          setText("#pkg-origin", result.origin);
          setText("#pkg-destination-route", result.destination);

          const modeImg = document.querySelector("#pkg-mode-img");
          if (modeImg) {
            modeImg.src = modeImages[result.mode] || modeImages.plane;
            modeImg.alt = `${result.mode || "freight"} freight`;
          }

          const timeline = document.querySelector("#pkg-timeline");
          if (timeline && Array.isArray(result.timeline)) {
            timeline.innerHTML = result.timeline
              .map(
                (event) => `
                <li class="${event.done ? "is-done" : ""}">
                  <div class="timeline__dot" aria-hidden="true"></div>
                  <div>
                    <strong>${event.label}</strong>
                    <p>${event.detail}</p>
                    <time>${event.done && event.at ? formatDate(event.at) : "Pending"}</time>
                  </div>
                </li>`,
              )
              .join("");
          }
        })
        .catch((error) => {
          showError(
            error instanceof Error
              ? error.message
              : "Unable to load package details.",
          );
        });
    }
  }

  if (form && status) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      status.className = "form-status";
      status.textContent = "Sending your request…";

      const data = new FormData(form);
      const payload = {
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        origin: String(data.get("origin") || "").trim(),
        destination: String(data.get("destination") || "").trim(),
        mode: String(data.get("mode") || "plane"),
        details: String(data.get("details") || "").trim() || undefined,
      };

      try {
        const response = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to submit quote.");
        }

        status.classList.add("is-success");
        status.textContent = `${result.message} Reference: ${result.quote.id}`;
        form.reset();
      } catch (error) {
        status.classList.add("is-error");
        status.textContent =
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";
      }
    });
  }
})();

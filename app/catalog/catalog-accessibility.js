export function announceCatalogStatus(message) {
  const region = document.querySelector('[data-catalog-status]');
  if (region) region.textContent = message;
}

export function focusCatalogHeading() {
  const heading = document.querySelector('[data-catalog-heading]');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FilterPopupTitle from "../../../../app/maps/FilterPopupTitle";

describe("app/maps/FilterPopupTitle", () => {
  it("renders a visible back button when the filter flow can navigate back", () => {
    const html = renderToStaticMarkup(
      createElement(FilterPopupTitle, {
        canGoBack: true,
        onBack: () => undefined,
      }),
    );

    expect(html).toContain(">Back<");
    expect(html).toContain(">Filter<");
  });

  it("omits the back button when there is no previous filter step", () => {
    const html = renderToStaticMarkup(createElement(FilterPopupTitle));

    expect(html).toContain(">Filter<");
    expect(html).not.toContain(">Back<");
  });

  it("omits the back button when back navigation is requested without a handler", () => {
    const html = renderToStaticMarkup(
      createElement(FilterPopupTitle, {
        canGoBack: true,
      }),
    );

    expect(html).toContain(">Filter<");
    expect(html).not.toContain(">Back<");
  });
});

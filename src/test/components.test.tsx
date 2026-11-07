import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FindingCard } from "@/components/review/FindingCard";
import { DisputeModal } from "@/components/review/Dialogs";
import { HeroScene } from "@/components/landing/HeroScene";
import { findings } from "@/mocks/findings";
import { ruleById } from "@/mocks/rules";
import { applyDecisions } from "@/components/review/HighlightedText";

vi.mock("next/dynamic", () => ({ default: () => () => <canvas data-testid="webgl" /> }));

const f = findings[0];
const rule = ruleById(f.rule_id)!;
const noop = () => {};

describe("FindingCard", () => {
  it("shows issue, severity label, confidence, source and fix, and accepts", () => {
    const onAccept = vi.fn();
    render(
      <FindingCard
        finding={f}
        rule={rule}
        decision={{ state: "open" }}
        index={0}
        active={false}
        onActive={noop}
        onAccept={onAccept}
        onEdit={noop}
        onDispute={noop}
        onOpenSource={noop}
      />,
    );
    expect(screen.getByRole("heading", { name: f.issue })).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument(); // text label, not colour only
    expect(screen.getByText(/Confidence 94%/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Claims Policy 3.2/ })).toBeInTheDocument();
    expect(screen.getByText(f.suggested_fix)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Accept/ }));
    expect(onAccept).toHaveBeenCalledWith(f);
  });
});

describe("DisputeModal", () => {
  it("refuses to submit without a written reason", () => {
    const onSubmit = vi.fn();
    render(<DisputeModal finding={f} onClose={noop} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit dispute" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: /Reason/ })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/Please write a reason/)).toBeInTheDocument();
  });

  it("submits once a reason is given", () => {
    const onSubmit = vi.fn();
    render(<DisputeModal finding={f} onClose={noop} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole("textbox", { name: /Reason/ }), {
      target: { value: "We have a benchmark from Q2." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit dispute" }));
    expect(onSubmit).toHaveBeenCalledWith(f, "We have a benchmark from Q2.");
  });
});

describe("Reduced motion", () => {
  it("renders the static hero instead of WebGL when reduce motion is on", () => {
    sessionStorage.setItem("onbrand.reduceMotion", "true");
    render(<HeroScene />);
    expect(screen.queryByTestId("webgl")).not.toBeInTheDocument();
    expect(screen.getByText("Guaranteed results in 7 days!")).toBeInTheDocument();
  });

  it("renders the 3D scene (after deferred load) when motion is allowed", async () => {
    render(<HeroScene />);
    expect(screen.queryByTestId("webgl")).not.toBeInTheDocument(); // static shield first
    expect(await screen.findByTestId("webgl", {}, { timeout: 3000 })).toBeInTheDocument();
  });
});

describe("Fix application", () => {
  it("applies accepted fixes only where a human decided", () => {
    const text = "Upgrade for only $5/month in Zippy Drive.";
    const out = applyDecisions(text, findings, { f3: { state: "accepted", fix: "$9/month" } });
    expect(out).toBe("Upgrade for $9/month in Zippy Drive.");
  });
});

describe("Default motion", () => {
  it("runs motion by default even when the OS asks for reduced motion", async () => {
    (window.matchMedia as unknown as ReturnType<typeof vi.fn>).mockImplementation((q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    render(<HeroScene />);
    expect(await screen.findByTestId("webgl", {}, { timeout: 3000 })).toBeInTheDocument();
  });
});

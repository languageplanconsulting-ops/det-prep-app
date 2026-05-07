type CheckoutHostedImage = {
  type: "url";
  url: string;
};

type CheckoutBrandingSettings = {
  background_color?: string;
  border_style?: "pill" | "rectangular" | "rounded";
  button_color?: string;
  display_name?: string;
  font_family?:
    | "be_vietnam_pro"
    | "bitter"
    | "chakra_petch"
    | "default"
    | "hahmlet"
    | "inconsolata"
    | "inter"
    | "lato"
    | "lora"
    | "m_plus_1_code"
    | "montserrat"
    | "noto_sans"
    | "noto_sans_jp"
    | "noto_serif"
    | "nunito"
    | "open_sans"
    | "pridi"
    | "pt_sans"
    | "pt_serif"
    | "raleway"
    | "roboto"
    | "roboto_slab"
    | "source_sans_pro"
    | "titillium_web"
    | "ubuntu_mono"
    | "zen_maru_gothic";
  icon?: CheckoutHostedImage;
  logo?: CheckoutHostedImage;
};

type CheckoutCustomText = {
  after_submit?: { message: string };
  submit?: { message: string };
};

function optionalImage(kind: "logo" | "icon"): CheckoutHostedImage | undefined {
  const envKey = kind === "logo" ? "STRIPE_CHECKOUT_LOGO_URL" : "STRIPE_CHECKOUT_ICON_URL";
  const url = process.env[envKey]?.trim();
  if (!url) return undefined;
  return { type: "url", url };
}

export function buildThaiCheckoutBranding(displayName = "English Plan DET Prep"): CheckoutBrandingSettings {
  return {
    display_name: displayName,
    background_color: "#FFF8DC",
    button_color: "#004AAD",
    border_style: "rounded",
    font_family: "pridi",
    logo: optionalImage("logo"),
    icon: optionalImage("icon"),
  };
}

export function buildThaiCheckoutText(productLabelTh: string): CheckoutCustomText {
  return {
    submit: {
      message: `คุณกำลังชำระเงินสำหรับ ${productLabelTh} ระบบจะเปิดสิทธิ์ให้อัตโนมัติหลังชำระเงินสำเร็จ`,
    },
    after_submit: {
      message: "หากชำระเงินสำเร็จแต่สิทธิ์ยังไม่อัปเดตทันที ให้กลับไปหน้า Pricing แล้วรีเฟรชอีกครั้ง",
    },
  };
}

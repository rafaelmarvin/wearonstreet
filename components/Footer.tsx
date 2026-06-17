const WA_URL = "https://wa.me/message/BYUVWK2MYZNMK1";
const IG_URL = "https://www.instagram.com/wearonstreet_official/";
const TT_URL = "https://www.tiktok.com/@wearonstreet";

export default function Footer() {
  return (
    <section className="touchpoint" id="contact">
      <h2 className="section-title">TOUCHPOINT</h2>
      <div className="touchpoint-container">
        <div className="touchpoint-card">
          <p className="touchpoint-text">
            We&apos;re always open to talk, collaborate, or just vibe - reach us
            through any of our platforms.
          </p>
          <div className="touchpoint-footer">
            <span className="touchpoint-logo">WEARONSTREET</span>
            <div className="touchpoint-icon">
              <img width={40} height={40} src="/asset/logo.png" alt="" />
            </div>
          </div>
        </div>
        <div className="contact-card">
          <h3 className="contact-title">CONTACT US</h3>
          <div className="contact-items">
            <a className="contact-item" href={WA_URL} target="_blank" rel="noreferrer">
              <span className="contact-icon">📱</span>
              <span>+62 851-1121-0804</span>
            </a>
            <a className="contact-item" href={IG_URL} target="_blank" rel="noreferrer">
              <span className="contact-icon">📷</span>
              <span>INSTA : WEARONSTREET_OFFICIAL</span>
            </a>
            <a className="contact-item" href={TT_URL} target="_blank" rel="noreferrer">
              <span className="contact-icon">🎵</span>
              <span>TIKTOK : WEARONSTREET</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

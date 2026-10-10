import type { Metadata } from "next"
import { PolicySection, PolicyList } from "./policy-section"

const LAST_UPDATED = "August 20, 2026"

export const metadata: Metadata = {
  title: "Privacy Policy - Refetch",
  description: "How Refetch collects, uses, and stores your data.",
  openGraph: {
    title: "Privacy Policy - Refetch",
    description: "How Refetch collects, uses, and stores your data.",
    type: "website",
    url: "https://refetch.io/privacy",
    images: [
      {
        url: "https://refetch.io/og.png",
        width: 1200,
        height: 630,
        alt: "Privacy Policy - Refetch",
      },
    ],
    siteName: "Refetch",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy - Refetch",
    description: "How Refetch collects, uses, and stores your data.",
    images: ["https://refetch.io/og.png"],
  },
}

export default function PrivacyPage() {
  return (
    <main className="py-10">
      <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-xs text-gray-500">Last updated: {LAST_UPDATED}</p>

        <p className="mt-6 text-sm text-gray-700 leading-6">
          Refetch is an open-source, community-run tech news reader. We keep the amount of data we
          hold about you as small as the product allows, and this page explains exactly what that
          is. It covers the website at{" "}
          <a href="https://refetch.io" className="underline hover:text-gray-900">
            refetch.io
          </a>{" "}
          and the Refetch mobile and desktop apps.
        </p>

        <PolicySection title="What we collect">
          <p>
            <strong className="font-semibold text-gray-900">Account details.</strong> If you create
            an account we store the name, email address, and password you provide. Passwords are
            hashed by our authentication provider and are never visible to us.
          </p>
          <p>
            <strong className="font-semibold text-gray-900">What you post.</strong> Submissions,
            comments, and votes are stored and linked to your account. Submissions and comments are
            public by design. Votes are not shown next to your name, but they are stored with your
            account id so that each person votes once.
          </p>
          <p>
            <strong className="font-semibold text-gray-900">Push notification tokens.</strong> If
            you enable notifications in the mobile app, the device sends us a push token so our
            servers can deliver a notification to that device. Turning notifications off removes it.
          </p>
          <p>
            <strong className="font-semibold text-gray-900">Aggregate usage statistics.</strong> We
            use Plausible Analytics, which is cookie-free and does not collect personal data or
            build profiles across sites. It tells us how many people read a page, not who they are.
          </p>
        </PolicySection>

        <PolicySection title="What we do not collect">
          <PolicyList
            items={[
              "No advertising or cross-site tracking of any kind.",
              "No third-party analytics or advertising cookies.",
              "No location data, contacts, photos, or device identifiers used for tracking.",
              "We do not sell, rent, or share your personal data with third parties for their own purposes.",
            ]}
          />
        </PolicySection>

        <PolicySection title="How we use it">
          <PolicyList
            items={[
              "To sign you in and keep you signed in.",
              "To attribute your submissions and comments to you, and to count each vote once.",
              "To send the notifications you asked for, such as replies to your posts.",
              "To understand overall traffic so we can improve the site.",
            ]}
          />
          <p>
            We do not use your content to train machine learning models. Refetch uses AI to
            summarise and rank <em>linked news articles</em>; that process reads the third-party
            article, not your account or your comments.
          </p>
        </PolicySection>

        <PolicySection title="Where your data lives">
          <p>
            Accounts and content are stored with{" "}
            <a
              href="https://appwrite.io"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900"
            >
              Appwrite Cloud
            </a>{" "}
            on infrastructure hosted in the European Union, and are handled under{" "}
            <a
              href="https://appwrite.io/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900"
            >
              Appwrite&apos;s privacy policy
            </a>
            . Aggregate statistics are held by{" "}
            <a
              href="https://plausible.io/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900"
            >
              Plausible
            </a>
            , also in the EU. We keep your account data for as long as your account exists.
          </p>
        </PolicySection>

        <PolicySection title="Cookies">
          <p>
            We use a single session cookie to keep you signed in. There are no advertising,
            marketing, or third-party tracking cookies. Signing out clears the session.
          </p>
        </PolicySection>

        <PolicySection title="Your choices">
          <PolicyList
            items={[
              "You can read Refetch without an account. Browsing, opening stories, and reading comments require no sign-in.",
              "You can delete your own submissions and comments at any time.",
              "You can turn notifications off in the app at any time.",
              "You can ask us to delete your account and the personal data attached to it.",
            ]}
          />
          <p>
            Depending on where you live you may also have the right to access, correct, export, or
            object to our use of your data. Email us and we will help.
          </p>
        </PolicySection>

        <PolicySection title="Children">
          <p>
            Refetch is not directed at children under 13, and we do not knowingly collect their
            personal data. If you believe a child has given us data, contact us and we will remove
            it.
          </p>
        </PolicySection>

        <PolicySection title="Changes to this policy">
          <p>
            If we change how we handle your data we will update this page and its date. Because
            Refetch is open source, every change is also visible in the{" "}
            <a
              href="https://github.com/refetch-io/refetch"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900"
            >
              public repository
            </a>
            .
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            Questions, deletion requests, or anything else about your data: open an issue on{" "}
            <a
              href="https://github.com/refetch-io/refetch/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900"
            >
              GitHub
            </a>{" "}
            or email{" "}
            <a href="mailto:privacy@refetch.io" className="underline hover:text-gray-900">
              privacy@refetch.io
            </a>
            .
          </p>
        </PolicySection>
      </div>
    </main>
  )
}

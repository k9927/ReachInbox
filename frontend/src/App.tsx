import { useCallback, useEffect, useState } from "react";
import { AlertCircle, LoaderCircle, Plus, Settings2, ShieldCheck } from "lucide-react";
import { EmailItem, Sender, SlackStatus, User } from "./types";
import { fetchCurrentUser, logoutUser } from "./api/auth";
import { fetchEmails } from "./api/emails";
import { fetchSenders } from "./api/senders";
import { fetchSlackStatus } from "./api/slack";

import { Sidebar } from "./components/layout/Sidebar";
import { TopHeader } from "./components/layout/TopHeader";
import { SummaryCards } from "./components/dashboard/SummaryCards";
import { TableControls } from "./components/dashboard/TableControls";
import { EmailTable } from "./components/dashboard/EmailTable";
import { Pagination } from "./components/dashboard/Pagination";
import { ComposeModal } from "./components/campaign/ComposeModal";
import { SenderModal } from "./components/settings/SenderModal";
import { IntegrationsPanel } from "./components/settings/IntegrationsPanel";
import { EmailDetailModal } from "./components/dashboard/EmailDetailModal";
import { Toast } from "./components/common/Toast";
import { LoginView } from "./components/auth/LoginView";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [total, setTotal] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  const [senders, setSenders] = useState<Sender[]>([]);
  const [slack, setSlack] = useState<SlackStatus | null>(null);

  const [modal, setModal] = useState<"campaign" | "sender" | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [showIntegrations, setShowIntegrations] = useState(false);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refreshData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const [emailResult, senderResult, slackResult] = await Promise.all([
        fetchEmails(tab, page, 25, query),
        fetchSenders(),
        fetchSlackStatus(),
      ]);

      setEmails(emailResult.emails);
      setTotal(emailResult.pagination.total);
      if (tab === "scheduled") setScheduledCount(emailResult.pagination.total);
      if (tab === "sent") setSentCount(emailResult.pagination.total);

      setSenders(senderResult);
      setSlack(slackResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load outreach data");
    } finally {
      setLoading(false);
    }
  }, [user, page, query, tab]);

  useEffect(() => {
    fetchCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoadingUser(false));
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  // Handle OAuth callback parameters in URL query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("authError")) {
      setError("Google authentication could not be completed. Please try again.");
    }
    if (params.get("slack") === "connected") {
      setNotice("Slack workspace connected! Please set your notification channel.");
      setShowIntegrations(true);
    }
    if (params.get("slack") === "failed") {
      setError("Slack authorization failed or was cancelled.");
      setShowIntegrations(true);
    }
    if (params.has("authError") || params.has("slack")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Auto-dismiss toast notice after 4 seconds
  useEffect(() => {
    if (notice) {
      const timeout = window.setTimeout(() => setNotice(""), 4000);
      return () => clearTimeout(timeout);
    }
  }, [notice]);

  async function handleSignOut() {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  }

  if (loadingUser) {
    return (
      <div className="screen-center">
        <LoaderCircle className="spin" size={24} />
      </div>
    );
  }

  if (!user) {
    return <LoginView error={error} />;
  }

  return (
    <div className="app-shell">
      <Sidebar
        user={user}
        activeTab={tab}
        onTabChange={(newTab) => {
          setTab(newTab);
          setPage(1);
        }}
        onOpenCampaignModal={() => setModal("campaign")}
        onOpenIntegrations={() => setShowIntegrations(true)}
        onSignOut={handleSignOut}
        scheduledCount={tab === "scheduled" ? total : scheduledCount}
        sentCount={tab === "sent" ? total : sentCount}
      />

      <main className="main-area">
        <TopHeader
          user={user}
          onSignOut={handleSignOut}
          onToggleMobileMenu={() => setShowIntegrations(!showIntegrations)}
        />

        <section className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot" />
                YOUR OUTREACH OVERVIEW
              </div>
              <h1>Email activity</h1>
              <p>Keep an eye on every message, from scheduled to delivered.</p>
            </div>
            <button
              className="button button-primary"
              onClick={() => setModal("campaign")}
            >
              <Plus size={17} />
              <span>Compose New Email</span>
            </button>
          </div>

          <SummaryCards
            activeTab={tab}
            totalEmails={total}
            sendersCount={senders.length}
            loading={loading}
          />

          <section className="table-card">
            <div className="table-head">
              <div>
                <h2>Your emails</h2>
                <p>A complete view of scheduled and sent outreach activity.</p>
              </div>
              <button
                className="button button-outline"
                onClick={() => setShowIntegrations(true)}
              >
                <Settings2 size={15} />
                <span>Manage senders</span>
              </button>
            </div>

            <TableControls
              activeTab={tab}
              onTabChange={(newTab) => {
                setTab(newTab);
                setPage(1);
              }}
              searchQuery={query}
              onSearchChange={(newQuery) => {
                setQuery(newQuery);
                setPage(1);
              }}
              scheduledCount={tab === "scheduled" ? total : scheduledCount}
              sentCount={tab === "sent" ? total : sentCount}
            />

            {error && (
              <div className="inline-error">
                <AlertCircle size={16} />
                <span>{error}</span>
                <button onClick={() => void refreshData()}>Retry</button>
              </div>
            )}

            <EmailTable
              emails={emails}
              activeTab={tab}
              loading={loading}
              searchQuery={query}
              onOpenCampaignModal={() => setModal("campaign")}
              onSelectEmail={(em) => setSelectedEmail(em)}
            />

            <Pagination
              page={page}
              pageSize={25}
              total={total}
              loading={loading}
              onPageChange={setPage}
            />
          </section>

          <div className="trust-note">
            <ShieldCheck size={15} />
            <span>
              Per-sender hourly limits & minimum throttle delay are enforced across persistent BullMQ workers.
            </span>
          </div>
        </section>
      </main>

      {/* Modals & Drawers */}
      {modal === "campaign" && (
        <ComposeModal
          senders={senders}
          onClose={() => setModal(null)}
          onAddSender={() => setModal("sender")}
          onSuccess={async () => {
            setModal(null);
            setTab("scheduled");
            setPage(1);
            setNotice("Your email campaign has been scheduled.");
            await refreshData();
          }}
        />
      )}

      {modal === "sender" && (
        <SenderModal
          onClose={() => setModal(null)}
          onSuccess={async () => {
            setModal(null);
            setNotice("Sender identity added to your workspace.");
            await refreshData();
          }}
        />
      )}

      {showIntegrations && (
        <IntegrationsPanel
          senders={senders}
          slack={slack}
          onClose={() => setShowIntegrations(false)}
          onAddSender={() => {
            setShowIntegrations(false);
            setModal("sender");
          }}
          onRefresh={refreshData}
          onNotice={setNotice}
        />
      )}

      {notice && <Toast message={notice} onClose={() => setNotice("")} />}

      {selectedEmail && (
        <EmailDetailModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
}

export default App;

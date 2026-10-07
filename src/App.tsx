import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { getMeta, setMeta } from './db/meta';
import { db } from './db/schema';
import { DEFAULT_VOLUME, installAudioUnlock, installTapSounds, setSoundEnabled, setSoundVolume, setTapSoundsEnabled } from './platform/audio';
import { isStandalone } from './platform/standalone';
import { Backdrop } from './ui/components/Backdrop';
import { useEquippedTheme } from './ui/hooks/theme';
import { TabBar, type Tab } from './ui/components/TabBar';
import { useDayCycle } from './ui/hooks/useDayCycle';
import { EventHost } from './ui/overlays/EventHost';
import { InstallGuide } from './ui/overlays/InstallGuide';
import { UpdateBanner } from './ui/overlays/UpdateBanner';
import { WhatsNewWindow } from './ui/overlays/WhatsNewWindow';
import { Awakening } from './ui/screens/Awakening';
import { NutritionScreen } from './ui/screens/NutritionScreen';
import { QuestsScreen } from './ui/screens/QuestsScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { StatusScreen } from './ui/screens/StatusScreen';
import { TrainingScreen } from './ui/screens/TrainingScreen';

export default function App() {
  const profile = useLiveQuery(async () => (await db.profile.get(1)) ?? null, [], 'loading' as const);
  const guideDismissed = useLiveQuery(async () => (await getMeta(db, 'installGuideDismissed')) ?? false, [], true);
  const soundOn = useLiveQuery(async () => (await getMeta(db, 'soundOn')) ?? true, [], true);
  const soundVolume = useLiveQuery(async () => (await getMeta(db, 'soundVolume')) ?? DEFAULT_VOLUME, [], DEFAULT_VOLUME);
  const tapSounds = useLiveQuery(async () => (await getMeta(db, 'tapSounds')) ?? false, [], false);
  const [tab, setTab] = useState<Tab>('status');
  const [guideRequested, setGuideRequested] = useState(false);
  const registered = profile !== 'loading' && profile !== null;

  useEffect(() => installAudioUnlock(), []);
  useEffect(() => installTapSounds(), []);
  useEffect(() => {
    setSoundEnabled(soundOn);
  }, [soundOn]);
  useEffect(() => {
    setSoundVolume(soundVolume);
  }, [soundVolume]);
  useEffect(() => {
    setTapSoundsEnabled(tapSounds);
  }, [tapSounds]);
  useDayCycle(registered);
  useEquippedTheme(registered);

  if (profile === 'loading') return <div className="min-h-dvh bg-void" />;

  const showGuide = !isStandalone() && (guideRequested || !guideDismissed);
  const closeGuide = () => {
    setGuideRequested(false);
    void setMeta(db, 'installGuideDismissed', true);
  };

  return (
    <>
      <Backdrop />
      {registered ? (
        <>
          {tab === 'status' && <StatusScreen onNavigate={setTab} />}
          {tab === 'quests' && <QuestsScreen />}
          {tab === 'training' && <TrainingScreen />}
          {tab === 'nutrition' && <NutritionScreen />}
          {tab === 'settings' && <SettingsScreen onShowInstallGuide={() => setGuideRequested(true)} />}
          <TabBar tab={tab} onChange={setTab} />
          <UpdateBanner />
          <EventHost onAssignPoints={() => setTab('status')} />
          <WhatsNewWindow />
        </>
      ) : (
        <Awakening />
      )}
      {showGuide && <InstallGuide onClose={closeGuide} />}
    </>
  );
}

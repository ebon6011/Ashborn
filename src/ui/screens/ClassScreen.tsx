import { useLiveQuery } from 'dexie-react-hooks';
import { progression } from '../../config/progression';
import { getMeta } from '../../db/meta';
import { db } from '../../db/schema';
import { Button } from '../components/Button';
import { ClassPicker } from '../components/ClassPicker';
import { Screen } from '../components/Screen';
import { SystemWindow } from '../components/SystemWindow';

/** Choose or change class. Before the Trial it explains how to earn one. */
export function ClassScreen({ onBack }: { onBack: () => void }) {
  const player = useLiveQuery(() => db.player.get(1), []);
  const trial = useLiveQuery(async () => (await getMeta(db, 'classTrial')) ?? null, [], null);
  if (!player) return null;
  const unlock = progression.classes.unlockLevel;

  return (
    <Screen title="Class">
      <Button variant="ghost" onClick={onBack} className="mb-3">
        Back
      </Button>
      <SystemWindow title="Class">
        {player.level < unlock ? (
          <p className="text-muted">{`Reach level ${unlock} to unlock the Class Change Trial. Finish it to choose your class.`}</p>
        ) : !player.trialDone ? (
          <p className="text-muted">
            {trial ? 'Finish the Trial on the Quests screen to choose your class.' : 'Your Class Change Trial is on its way. Open the Quests screen.'}
          </p>
        ) : (
          <ClassPicker onChosen={onBack} />
        )}
      </SystemWindow>
    </Screen>
  );
}

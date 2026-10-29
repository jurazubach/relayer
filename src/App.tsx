import { useCallback, useState } from 'react';
import { useGame, useLibrary, useRouter, type Mode, type Story } from './engine';
import { HomeScreen } from './ui/HomeScreen';
import { StoryScreen } from './ui/StoryScreen';
import { ChatsScreen } from './ui/ChatsScreen';
import { ChatScreen } from './ui/ChatScreen';
import { DebugSheet } from './ui/DebugSheet';
import { ErrorScreen } from './ui/ErrorScreen';
import { Notice } from './ui/Notice';
import { RevisionNotice } from './ui/RevisionNotice';
import { Paywall } from './ui/Paywall';

/** Связывание: вся логика в engine, всё оформление в ui. Здесь только маршруты. */
export function App() {
  const { route, goHome, openStory, play, rememberChat } = useRouter();
  const library = useLibrary(useCallback((story: Story) => openStory(story.id), [openStory]));

  if (route.screen === 'home') {
    return (
      <div className="phone">
        <HomeScreen
          stories={library.catalog}
          progressOf={library.progress}
          paywallOf={library.paywall}
          onOpen={openStory}
          onUpload={library.add}
        />
      </div>
    );
  }

  const story = library.find(route.id);
  if (!story) {
    return (
      <div className="phone">
        <ErrorScreen title={`История «${route.id}» не найдена`} onHome={goHome} />
      </div>
    );
  }

  if (route.screen === 'story') {
    return (
      <div className="phone">
        <StoryScreen
          story={story}
          progress={library.progress(story.id)}
          free={library.paywall(story)}
          onPlay={(mode) => play(story.id, mode)}
          onBack={goHome}
          onReset={() => library.reset(story.id)}
          onDelete={
            story.origin === 'upload'
              ? () => {
                  library.remove(story.id);
                  goHome();
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <GameShell
      key={story.id}
      story={story}
      stories={library.stories}
      thread={route.thread ?? null}
      mode={route.mode}
      onThreadChange={rememberChat}
      onBack={() => openStory(story.id)}
      onHome={goHome}
      onSelectStory={play}
    />
  );
}

/** Игра: чаты, уведомления и панель отладки поверх одной сессии движка. */
function GameShell({
  story,
  stories,
  thread,
  mode,
  onThreadChange,
  onBack,
  onHome,
  onSelectStory,
}: {
  story: Story;
  stories: Story[];
  /** Чат, открытый в прошлый раз: восстанавливаем после перезагрузки. */
  thread: string | null;
  /** Режим новой игры с экрана истории. */
  mode?: Mode;
  onThreadChange: (id: string, thread: string | null) => void;
  onBack: () => void;
  onHome: () => void;
  onSelectStory: (id: string) => void;
}) {
  const remember = useCallback(
    (next: string | null) => onThreadChange(story.id, next),
    [onThreadChange, story.id],
  );
  const game = useGame(story, thread, remember, mode);
  const [debug, setDebug] = useState(false);
  const locked = game.view?.locked;
  const paywall = (inList: boolean) =>
    locked ? <Paywall inList={inList} /> : undefined;

  return (
    <div className="phone">
      {game.outdated && (
        <RevisionNotice from={game.outdated.from} to={game.outdated.to} done onClose={game.hideOutdated} />
      )}
      {game.notice && game.engine && (
        <Notice
          msg={game.notice}
          contact={game.engine.contact(game.notice.thread)}
          onOpen={game.openNotice}
          onDone={game.hideNotice}
        />
      )}

      {game.engine && game.view ? (
        game.open ? (
          <ChatScreen
            engine={game.engine}
            view={game.view}
            thread={game.open}
            onBack={() => game.openChat(null)}
            onOpen={game.openChat}
            onDebug={() => setDebug(true)}
            paywall={paywall(false)}
          />
        ) : (
          <ChatsScreen
            engine={game.engine}
            view={game.view}
            onOpen={game.openChat}
            backLabel={story.title}
            onBack={onBack}
            onDebug={() => setDebug(true)}
            notices={game.notices}
            onNotices={game.setNotices}
            paywall={paywall(true)}
          />
        )
      ) : (
        <ErrorScreen title="Сценарий не собрался" details={game.errors} onHome={onHome} />
      )}

      {debug && (
        <DebugSheet
          engine={game.engine}
          stories={stories}
          storyId={story.id}
          onSelectStory={onSelectStory}
          onHome={onHome}
          onClose={() => setDebug(false)}
          freeChapters={game.freeChapters}
          chaptersOpen={game.chaptersOpen}
          onChaptersOpen={game.setChaptersOpen}
        />
      )}
    </div>
  );
}

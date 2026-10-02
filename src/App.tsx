import { useCallback, useState } from 'react';
import { useGame, useLibrary, useRouter, type Story } from './engine';
import { HomeScreen } from './ui/HomeScreen';
import { StoryScreen } from './ui/StoryScreen';
import { ChatsScreen } from './ui/ChatsScreen';
import { ChatScreen } from './ui/ChatScreen';
import { DebugSheet } from './ui/DebugSheet';
import { ErrorScreen } from './ui/ErrorScreen';
import { Notice } from './ui/Notice';

/** Связывание: вся логика в engine, всё оформление в ui. Здесь только маршруты. */
export function App() {
  const { route, goHome, openStory, play } = useRouter();
  const library = useLibrary(useCallback((story: Story) => openStory(story.id), [openStory]));

  if (route.screen === 'home') {
    return (
      <div className="phone">
        <HomeScreen
          stories={library.stories}
          progressOf={library.progress}
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
          onPlay={() => play(story.id)}
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
  onBack,
  onHome,
  onSelectStory,
}: {
  story: Story;
  stories: Story[];
  onBack: () => void;
  onHome: () => void;
  onSelectStory: (id: string) => void;
}) {
  const game = useGame(story);
  const [debug, setDebug] = useState(false);

  return (
    <div className="phone">
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
          />
        ) : (
          <ChatsScreen
            engine={game.engine}
            view={game.view}
            onOpen={game.openChat}
            backLabel={story.title}
            onBack={onBack}
            onDebug={() => setDebug(true)}
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
        />
      )}
    </div>
  );
}

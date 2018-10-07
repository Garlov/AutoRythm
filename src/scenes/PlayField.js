import Phaser from 'phaser';
import gameConfig from 'configs/gameConfig';
import Board from 'entities/playField/Board';
import createFrequencyMap from 'utils/createFrequencyMap';
import canEmit from 'components/canEmit';
import hasInput from 'components/hasInput';
import canListen from 'components/canListen';
import eventConfig from 'configs/eventConfig';
import getFunctionUsage from 'utils/getFunctionUsage';
import pipe from 'utils/pipe';
import ScoreScreen from 'entities/playField/ScoreScreen';

const PlayField = function PlayFieldFunc(key) {
    const state = new Phaser.Scene(gameConfig.SCENES.PLAY_FIELD);
    let board;
    let scoreScreen;
    const currentKey = key;
    let freqMap;

    function init() {}

    function _showScoreScreen(gameData) {
        if (scoreScreen) return;
        const audioMan = state.scene.manager.getScene(gameConfig.SCENES.GAME).getAudioManager();
        audioMan.stopMusic();
        scoreScreen = ScoreScreen(state, gameData);
        scoreScreen.init();
        scoreScreen.setScore(gameData.score);
        scoreScreen.setWin(!gameData.escape && !gameData.loss);
        state.listenOnce(scoreScreen, eventConfig.EVENTS.SCORE_SCREEN.MENU, _onGoToMenu);
        state.listenOnce(scoreScreen, eventConfig.EVENTS.SCORE_SCREEN.RETRY, _onRetry);
    }

    function _onSongEnd(e) {
        _showScoreScreen(e);
    }

    function createBoard() {
        if (board) {
            board.destroy();
            board = undefined;
        }

        const audioMan = state.scene.manager.getScene(gameConfig.SCENES.GAME).getAudioManager();
        audioMan.playMusic(currentKey);
        const currentSong = audioMan.getCurrentSong();
        currentSong.loop = false;

        board = Board(state);
        state.listenOnce(board, eventConfig.EVENTS.SONG.SONG_END, _onSongEnd);
        board.setFrequencyMap(currentSong, freqMap);
        board.init();
    }

    function _onGoToMenu() {
        state.emitGlobal(eventConfig.EVENTS.GAME.PLAY_ENDED, {});
    }

    function _onRetry() {
        if (scoreScreen) {
            scoreScreen.destroy();
            scoreScreen = undefined;
        }
        const audioMan = state.scene.manager.getScene(gameConfig.SCENES.GAME).getAudioManager();
        audioMan.stopMusic();
        audioMan.playMusic(currentKey);
        const currentSong = audioMan.getCurrentSong();
        currentSong.loop = false;

        createBoard();
    }

    function createFreqMap() {
        if (!freqMap) {
            const audioMan = state.scene.manager.getScene(gameConfig.SCENES.GAME).getAudioManager();
            const currentSong = audioMan.getCurrentSong();

            const threshold = [-40000, -30000, -30000, -30000];

            // percentile ranges for each lane in the frequency map.
            const laneRanges = [0.05, 0.15, 0.4, 75];
            freqMap = createFrequencyMap(currentSong.audioBuffer, 4, laneRanges, threshold);
        }
    }

    function create() {
        const audioMan = state.scene.manager.getScene(gameConfig.SCENES.GAME).getAudioManager();
        audioMan.playMusic(currentKey);
        const currentSong = audioMan.getCurrentSong();
        currentSong.pause();
        currentSong.loop = false;

        createFreqMap();
        createBoard();

        currentSong.resume();
    }

    function update(time, delta) {
        if (board && !scoreScreen) {
            board.update(delta);
        }
    }

    function destroy() {
        if (board) {
            board.destroy();
            board = undefined;
        }

        if (scoreScreen) {
            scoreScreen.destroy();
            scoreScreen = undefined;
        }

        freqMap = undefined;
    }

    const canEmitState = canEmit(state);
    const hasInputState = hasInput(state);
    const canListenState = canListen(state);

    const localState = {
        // props
        // methods
        init,
        create,
        update,
        destroy,
    };

    const states = [
        { state, name: 'state' },
        { state: localState, name: 'localState' },
        { state: canEmitState, name: 'canEmit' },
        { state: hasInputState, name: 'hasInput' },
        { state: canListenState, name: 'canListen' },
    ];

    getFunctionUsage(states, 'PlayField');
    return Object.assign(...states.map(s => s.state), {
        // pipes and overrides
        update: pipe(
            localState.update,
            state.update,
        ),
        destroy: pipe(
            localState.destroy,
            canEmit.destroy,
            canListen.destroy,
        ),
    });
};

export default PlayField;

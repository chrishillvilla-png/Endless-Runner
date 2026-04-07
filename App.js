import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Pressable,
  StatusBar,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const GROUND_HEIGHT = 120;
const PLAYER_WIDTH = 44;
const PLAYER_HEIGHT = 60;
const PLAYER_X = 70;

const INITIAL_SPEED = 300;
const GRAVITY = 1800;
const JUMP_FORCE = -700;
const MAX_FALL_SPEED = 1200;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function createObstacle(startX, speed) {
  const width = Math.round(randomRange(26, 52));
  const height = Math.round(randomRange(36, 80));

  return {
    id: `${Date.now()}-${Math.random()}`,
    x: startX,
    y: SCREEN_HEIGHT - GROUND_HEIGHT - height,
    width,
    height,
    passed: false,
    speedOffset: randomRange(0, speed * 0.08),
  };
}

export default function App() {
  const [gameState, setGameState] = useState('ready');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [playerY, setPlayerY] = useState(SCREEN_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT);
  const [obstacles, setObstacles] = useState([]);
  const [clouds, setClouds] = useState([
    { id: 'c1', x: 30, y: 100, scale: 1.1 },
    { id: 'c2', x: 180, y: 70, scale: 0.9 },
    { id: 'c3', x: 300, y: 130, scale: 1.0 },
  ]);
  const [hills, setHills] = useState([
    { id: 'h1', x: 0, width: 180, height: 80 },
    { id: 'h2', x: 140, width: 230, height: 100 },
    { id: 'h3', x: 340, width: 210, height: 70 },
  ]);

  const playerYRef = useRef(SCREEN_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT);
  const velocityYRef = useRef(0);
  const obstaclesRef = useRef([]);
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const spawnTimerRef = useRef(0);
  const lastFrameRef = useRef(null);
  const frameRef = useRef(null);

  const groundY = SCREEN_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT;
  const isOnGround = playerY >= groundY - 1;

  const resetGame = () => {
    playerYRef.current = groundY;
    velocityYRef.current = 0;
    obstaclesRef.current = [];
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    spawnTimerRef.current = 0;
    lastFrameRef.current = null;

    setPlayerY(groundY);
    setObstacles([]);
    setScore(0);

    setClouds([
      { id: 'c1', x: 30, y: 100, scale: 1.1 },
      { id: 'c2', x: 180, y: 70, scale: 0.9 },
      { id: 'c3', x: 300, y: 130, scale: 1.0 },
    ]);

    setHills([
      { id: 'h1', x: 0, width: 180, height: 80 },
      { id: 'h2', x: 140, width: 230, height: 100 },
      { id: 'h3', x: 340, width: 210, height: 70 },
    ]);
  };

  const startGame = () => {
    resetGame();
    setGameState('running');
  };

  const jump = () => {
    if (gameState === 'ready') {
      startGame();
      return;
    }

    if (gameState === 'gameover') {
      startGame();
      return;
    }

    const nearGround = playerYRef.current >= groundY - 8;
    if (nearGround) {
      velocityYRef.current = JUMP_FORCE;
    }
  };

  useEffect(() => {
    if (gameState !== 'running') {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      return;
    }

    const loop = (time) => {
      if (lastFrameRef.current == null) {
        lastFrameRef.current = time;
      }

      let dt = (time - lastFrameRef.current) / 1000;
      dt = Math.min(dt, 0.032);
      lastFrameRef.current = time;

      speedRef.current += dt * 4;

      velocityYRef.current += GRAVITY * dt;
      velocityYRef.current = clamp(velocityYRef.current, -9999, MAX_FALL_SPEED);
      playerYRef.current += velocityYRef.current * dt;

      if (playerYRef.current > groundY) {
        playerYRef.current = groundY;
        velocityYRef.current = 0;
      }

      spawnTimerRef.current += dt;
      const spawnGap = clamp(1.35 - scoreRef.current * 0.01, 0.75, 1.35);

      if (spawnTimerRef.current >= spawnGap) {
        spawnTimerRef.current = 0;

        const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
        const safeDistance = 180 + Math.random() * 100;

        if (!lastObstacle || lastObstacle.x < SCREEN_WIDTH - safeDistance) {
          obstaclesRef.current = [
            ...obstaclesRef.current,
            createObstacle(SCREEN_WIDTH + 30, speedRef.current),
          ];
        }
      }

      let nextObstacles = obstaclesRef.current
        .map((obs) => ({
          ...obs,
          x: obs.x - (speedRef.current + obs.speedOffset) * dt,
        }))
        .filter((obs) => obs.x + obs.width > -30);

      nextObstacles = nextObstacles.map((obs) => {
        if (!obs.passed && obs.x + obs.width < PLAYER_X) {
          obs.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
        }
        return obs;
      });

      obstaclesRef.current = nextObstacles;

      const playerBox = {
        x: PLAYER_X + 6,
        y: playerYRef.current + 4,
        width: PLAYER_WIDTH - 12,
        height: PLAYER_HEIGHT - 4,
      };

      const hit = nextObstacles.some((obs) =>
        isColliding(playerBox, {
          x: obs.x,
          y: obs.y,
          width: obs.width,
          height: obs.height,
        })
      );

      setClouds((prev) =>
        prev.map((cloud) => {
          let nextX = cloud.x - 22 * dt;
          if (nextX < -90) nextX = SCREEN_WIDTH + Math.random() * 50;
          return { ...cloud, x: nextX };
        })
      );

      setHills((prev) =>
        prev.map((hill) => {
          let nextX = hill.x - 60 * dt;
          if (nextX + hill.width < 0) nextX = SCREEN_WIDTH + Math.random() * 40;
          return { ...hill, x: nextX };
        })
      );

      setPlayerY(playerYRef.current);
      setObstacles([...obstaclesRef.current]);

      if (hit) {
        setBest((prev) => Math.max(prev, scoreRef.current));
        setGameState('gameover');
        return;
      }

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [gameState]);

  const jumpHeight = groundY - playerY;
  const shadowWidth = 34 + jumpHeight * 0.02;
  const shadowOpacity = clamp(0.28 - jumpHeight * 0.002, 0.1, 0.28);

  return (
    <TouchableWithoutFeedback onPress={jump}>
      <View style={styles.container}>
        <StatusBar hidden />

        <View style={styles.sky} />
        <View style={styles.skyGlow} />
        <View style={styles.sun} />

        {clouds.map((cloud) => (
          <View
            key={cloud.id}
            style={[
              styles.cloud,
              {
                left: cloud.x,
                top: cloud.y,
                transform: [{ scale: cloud.scale }],
              },
            ]}
          >
            <View style={styles.cloudPartBig} />
            <View style={styles.cloudPartLeft} />
            <View style={styles.cloudPartRight} />
          </View>
        ))}

        {hills.map((hill) => (
          <View
            key={hill.id}
            style={[
              styles.hill,
              {
                left: hill.x,
                width: hill.width,
                height: hill.height,
              },
            ]}
          />
        ))}

        <View style={styles.scoreRow}>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>SCORE</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>

          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>BEST</Text>
            <Text style={styles.scoreValue}>{best}</Text>
          </View>
        </View>

        {obstacles.map((obs) => (
          <View
            key={obs.id}
            style={[
              styles.obstacle,
              {
                left: obs.x,
                top: obs.y,
                width: obs.width,
                height: obs.height,
              },
            ]}
          >
            <View style={styles.obstacleHighlight} />
          </View>
        ))}

        <View
          style={[
            styles.playerShadow,
            {
              left: PLAYER_X + 5,
              top: SCREEN_HEIGHT - GROUND_HEIGHT - 8,
              width: shadowWidth,
              opacity: shadowOpacity,
            },
          ]}
        />

        <View
          style={[
            styles.playerWrap,
            {
              left: PLAYER_X,
              top: playerY,
              transform: [
                { scaleY: isOnGround ? 1 : 0.95 },
                { scaleX: isOnGround ? 1 : 1.05 },
              ],
            },
          ]}
        >
          <View style={styles.player}>
            <View style={styles.playerFace} />
            <View style={styles.playerEye} />
          </View>
        </View>

        <View style={styles.groundTop} />
        <View style={styles.ground} />
        <View style={styles.groundShade} />

        {gameState === 'ready' && (
          <View style={styles.overlay}>
            <Text style={styles.title}>ENDLESS RUNNER</Text>
            <Text style={styles.subtitle}>Tap anywhere to jump</Text>
            <Text style={styles.info}>The speed increases as you survive longer</Text>

            <Pressable style={styles.button} onPress={startGame}>
              <Text style={styles.buttonText}>Start Game</Text>
            </Pressable>
          </View>
        )}

        {gameState === 'gameover' && (
          <View style={styles.overlay}>
            <Text style={styles.title}>Game Over</Text>
            <Text style={styles.subtitle}>Score: {score}</Text>
            <Text style={styles.info}>Tap anywhere or use the button below</Text>

            <Pressable style={styles.button} onPress={startGame}>
              <Text style={styles.buttonText}>Restart</Text>
            </Pressable>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d6f1ff',
  },

  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#bfe9ff',
  },

  skyGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#dff6ff',
  },

  sun: {
    position: 'absolute',
    top: 70,
    right: 35,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff2b3',
    opacity: 0.95,
  },

  scoreRow: {
    position: 'absolute',
    top: 52,
    left: 18,
    right: 18,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  scoreBox: {
    minWidth: 95,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
  },

  scoreLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4b5563',
    letterSpacing: 1,
  },

  scoreValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },

  cloud: {
    position: 'absolute',
    width: 70,
    height: 34,
  },

  cloudPartBig: {
    position: 'absolute',
    left: 18,
    top: 8,
    width: 34,
    height: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },

  cloudPartLeft: {
    position: 'absolute',
    left: 6,
    top: 12,
    width: 24,
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },

  cloudPartRight: {
    position: 'absolute',
    left: 38,
    top: 12,
    width: 22,
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },

  hill: {
    position: 'absolute',
    bottom: GROUND_HEIGHT - 10,
    backgroundColor: '#8bd88b',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
  },

  obstacle: {
    position: 'absolute',
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    overflow: 'hidden',
  },

  obstacleHighlight: {
    position: 'absolute',
    top: 0,
    left: 5,
    width: 6,
    height: '100%',
    backgroundColor: '#ef4444',
    opacity: 0.7,
  },

  playerWrap: {
    position: 'absolute',
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    zIndex: 20,
  },

  player: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },

  playerFace: {
    position: 'absolute',
    top: 14,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#bbf7d0',
  },

  playerEye: {
    position: 'absolute',
    top: 18,
    right: 12,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#052e16',
  },

  playerShadow: {
    position: 'absolute',
    height: 10,
    borderRadius: 10,
    backgroundColor: '#000',
    zIndex: 5,
  },

  groundTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: GROUND_HEIGHT - 8,
    height: 8,
    backgroundColor: '#7ccf3b',
  },

  ground: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: GROUND_HEIGHT,
    backgroundColor: '#5d8f23',
  },

  groundShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: GROUND_HEIGHT / 2,
    backgroundColor: '#4a731b',
  },

  overlay: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.2,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    zIndex: 100,
  },

  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },

  subtitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },

  info: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },

  button: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
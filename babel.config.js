// babel.config.js  (프로젝트 루트)
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated는 반드시 마지막 플러그인이어야 합니다.
    plugins: ['react-native-reanimated/plugin'],
  };
};

import "./index.css";
import { Composition, Folder } from "remotion";
import { HelloWorld } from "./HelloWorld";
import { Logo } from "./HelloWorld/Logo";
import { Title } from "./HelloWorld/Title";
import {
  EstimatorMotionVideo,
  ESTIMATOR_VIDEO_DURATION,
} from "./EstimatorMotionVideo";
import {
  Estimator3DVideo,
  ESTIMATOR_3D_DURATION,
} from "./Estimator3DVideo";
import {
  EstimatorWebGLVideo,
  ESTIMATOR_WEBGL_60S_DURATION,
} from "./EstimatorWebGL60s";
import {
  EstimatorMotion3DVideo,
  ESTIMATOR_MOTION3D_DURATION,
} from "./EstimatorMotion3D";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Exact WebGL2 3D Motion Graphic ported from motion3d.html */}
      <Folder name="Monefyi-Estimator-Motion3D">
        <Composition
          id="EstimatorMotion3DReels"
          component={EstimatorMotion3DVideo}
          durationInFrames={ESTIMATOR_MOTION3D_DURATION}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="EstimatorMotion3DSquare"
          component={EstimatorMotion3DVideo}
          durationInFrames={ESTIMATOR_MOTION3D_DURATION}
          fps={30}
          width={1080}
          height={1080}
        />
        <Composition
          id="EstimatorMotion3DLandscape"
          component={EstimatorMotion3DVideo}
          durationInFrames={ESTIMATOR_MOTION3D_DURATION}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>
      {/* Brand New: True WebGL 3D (Three.js) - 60s Anatomi Biaya Gaib */}
      <Folder name="Monefyi-Estimator-WebGL-60s">
        <Composition
          id="EstimatorWebGL60sReels"
          component={EstimatorWebGLVideo}
          durationInFrames={ESTIMATOR_WEBGL_60S_DURATION}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="EstimatorWebGL60sSquare"
          component={EstimatorWebGLVideo}
          durationInFrames={ESTIMATOR_WEBGL_60S_DURATION}
          fps={30}
          width={1080}
          height={1080}
        />
        <Composition
          id="EstimatorWebGL60sLandscape"
          component={EstimatorWebGLVideo}
          durationInFrames={ESTIMATOR_WEBGL_60S_DURATION}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>

      {/* 30s 3D Isometric Motion Graphic */}
      <Folder name="Monefyi-Estimator-3D-30s">
        <Composition
          id="Estimator3DReels"
          component={Estimator3DVideo}
          durationInFrames={ESTIMATOR_3D_DURATION}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="Estimator3DSquare"
          component={Estimator3DVideo}
          durationInFrames={ESTIMATOR_3D_DURATION}
          fps={30}
          width={1080}
          height={1080}
        />
        <Composition
          id="Estimator3DLandscape"
          component={Estimator3DVideo}
          durationInFrames={ESTIMATOR_3D_DURATION}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>

      {/* 90s Full Motion Graphic */}
      <Folder name="Monefyi-Estimator-90s">
        <Composition
          id="EstimatorMotionReels"
          component={EstimatorMotionVideo}
          durationInFrames={ESTIMATOR_VIDEO_DURATION}
          fps={30}
          width={1080}
          height={1920}
        />
        <Composition
          id="EstimatorMotionSquare"
          component={EstimatorMotionVideo}
          durationInFrames={ESTIMATOR_VIDEO_DURATION}
          fps={30}
          width={1080}
          height={1080}
        />
        <Composition
          id="EstimatorMotionLandscape"
          component={EstimatorMotionVideo}
          durationInFrames={ESTIMATOR_VIDEO_DURATION}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>

      <Folder name="Examples">
        <Composition
          id="HelloWorld"
          component={HelloWorld}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            titleText: "Welcome to Remotion",
            titleColor: "#000000",
          }}
        />
        <Composition
          id="Logo"
          component={Logo}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            logoColor1: "#91EAE4",
            logoColor2: "#86A8E7",
          }}
        />
        <Composition
          id="Title"
          component={Title}
          durationInFrames={115}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{
            titleText: "Welcome to Remotion",
            titleColor: "#000000",
          }}
        />
      </Folder>
    </>
  );
};

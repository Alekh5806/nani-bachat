import React from 'react';
import Svg, {
  Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop,
} from 'react-native-svg';

// A resolution-independent illustration, shared by the web and native apps.
export const LoginArtwork = () => (
  <Svg width="100%" height="100%" viewBox="0 0 560 400" accessible={false}>
    <Defs>
      <RadialGradient id="loginHalo" cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0" stopColor="#5477EF" stopOpacity="0.27" />
        <Stop offset="1" stopColor="#5477EF" stopOpacity="0" />
      </RadialGradient>
      <LinearGradient id="loginBase" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#4C639C" stopOpacity="0.7" />
        <Stop offset="1" stopColor="#14243D" stopOpacity="0.15" />
      </LinearGradient>
      <LinearGradient id="loginFront" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#9EB4FF" />
        <Stop offset="0.45" stopColor="#5774E8" />
        <Stop offset="1" stopColor="#263D87" />
      </LinearGradient>
      <LinearGradient id="loginSide" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#4766DB" />
        <Stop offset="1" stopColor="#1E305E" />
      </LinearGradient>
      <LinearGradient id="loginTop" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#E2EAFF" />
        <Stop offset="1" stopColor="#8DA7FF" />
      </LinearGradient>
      <LinearGradient id="loginMint" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#C0F4D9" />
        <Stop offset="1" stopColor="#6DB89B" />
      </LinearGradient>
    </Defs>

    <Ellipse cx="290" cy="222" rx="260" ry="173" fill="url(#loginHalo)" />
    <G fill="none" stroke="#90A6DE" strokeWidth="0.8">
      <Ellipse cx="280" cy="278" rx="239" ry="90" opacity="0.17" />
      <Ellipse cx="280" cy="278" rx="201" ry="70" opacity="0.12" />
      <Path d="M66 216 Q281 85 499 213" strokeDasharray="3 9" opacity="0.2" />
    </G>

    <Path d="M113 272 L276 194 Q282 191 289 194 L447 272 L447 288 L289 368 Q282 371 275 367 L113 288 Z" fill="#101E36" stroke="#34496D" strokeWidth="0.8" />
    <Path d="M113 272 L276 192 Q282 189 289 192 L447 272 L289 352 Q282 355 275 351 Z" fill="url(#loginBase)" stroke="#7892C6" strokeOpacity="0.35" />
    <Path d="M145 272 L282 204 L416 272 L282 340 Z" fill="none" stroke="#839ED8" strokeOpacity="0.14" />

    <G>
      <Path d="M169 234 L213 256 L213 307 L169 285 Z" fill="url(#loginFront)" />
      <Path d="M213 256 L253 235 L253 286 L213 307 Z" fill="url(#loginSide)" />
      <Path d="M169 234 L209 214 L253 235 L213 256 Z" fill="url(#loginTop)" />
      <Path d="M170 235 L213 256 L213 305" fill="none" stroke="#D6E0FF" strokeOpacity="0.4" />
    </G>
    <G>
      <Path d="M244 177 L288 199 L288 290 L244 268 Z" fill="url(#loginFront)" />
      <Path d="M288 199 L328 178 L328 269 L288 290 Z" fill="url(#loginSide)" />
      <Path d="M244 177 L284 157 L328 178 L288 199 Z" fill="url(#loginTop)" />
      <Path d="M245 178 L288 199 L288 288" fill="none" stroke="#D6E0FF" strokeOpacity="0.5" />
    </G>
    <G>
      <Path d="M319 99 L363 121 L363 273 L319 251 Z" fill="url(#loginFront)" />
      <Path d="M363 121 L403 100 L403 252 L363 273 Z" fill="url(#loginSide)" />
      <Path d="M319 99 L359 79 L403 100 L363 121 Z" fill="url(#loginTop)" />
      <Path d="M320 100 L363 121 L363 271" fill="none" stroke="#EAF0FF" strokeOpacity="0.6" />
    </G>

    <Path d="M145 196 C188 183 209 157 238 139 S288 123 311 77" fill="none" stroke="#B9EED5" strokeWidth="2.5" strokeLinecap="round" />
    <Path d="M298 81 L312 74 L315 90" fill="none" stroke="#B9EED5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="145" cy="196" r="5" fill="#B9EED5" />

    <G transform="translate(115 109) rotate(-13)">
      <Circle r="29" fill="#14283A" stroke="#759F99" strokeOpacity="0.5" />
      <Circle r="22" fill="none" stroke="#759F99" strokeOpacity="0.25" />
      <Path d="M-8 -10 H9 M-8 -3 H9 M-7 -10 C8 -10 8 1 -5 1 L7 12" fill="none" stroke="url(#loginMint)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </G>
    <Circle cx="461" cy="251" r="6" fill="#AEC6FF" />
    <Circle cx="461" cy="251" r="12" fill="none" stroke="#AEC6FF" strokeOpacity="0.2" />
    <Circle cx="87" cy="310" r="3" fill="#A7DCC9" />
    <Circle cx="434" cy="80" r="3" fill="#A1B6EC" opacity="0.6" />
    <Path d="M427 166 H439 M433 160 V172 M206 65 H214 M210 61 V69" stroke="#A3B7EA" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
  </Svg>
);

export const LoginMark = ({ size = 38 }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
    <Path d="M6 23 L13 19 L13 31 L6 27 Z" fill="#8EA9FF" />
    <Path d="M17 16 L24 12 L24 31 L17 27 Z" fill="#B9CAFF" />
    <Path d="M28 9 L35 5 L35 26 L28 30 Z" fill="#D9E4FF" />
  </Svg>
);

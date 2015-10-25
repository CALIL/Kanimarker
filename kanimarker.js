
/*

Kanimarker

Copyright (c) 2015 CALIL Inc.
This software is released under the MIT License.
http://opensource.org/licenses/mit-license.php
 */
var Kanimarker;

Kanimarker = (function() {
  Kanimarker.prototype.map = null;

  Kanimarker.prototype.mode = 'normal';

  Kanimarker.prototype.position = null;

  Kanimarker.prototype.direction = 0;

  Kanimarker.prototype.accuracy = 0;

  Kanimarker.prototype.animations = {};

  Kanimarker.prototype.debug_ = false;

  Kanimarker.prototype.callbacks = {};

  Kanimarker.prototype.moveDuration = 2000;

  Kanimarker.prototype.accuracyDuration = 2000;

  function Kanimarker(map) {
    this.map = map;
    if (this.map != null) {
      this.map.on('postcompose', this.postcompose_, this);
      this.map.on('precompose', this.precompose_, this);
      this.map.on('pointerdrag', this.pointerdrag_, this);
    }
  }

  Kanimarker.prototype.cancelAnimation = function() {
    return this.animations = {};
  };

  Kanimarker.prototype.setDebug = function(value) {
    this.debug_ = value;
    return this.map.render();
  };

  Kanimarker.prototype.setMode = function(mode) {
    var animated, d, diff, from, froms, to;
    if (mode !== 'normal' && mode !== 'centered' && mode !== 'headingup') {
      throw 'invalid mode';
    }
    if (this.mode !== mode) {
      if (this.position === null && (mode === 'centered' || mode === 'headingup')) {
        return false;
      }
      if (this.direction === null && mode === 'headingup') {
        return false;
      }
      this.mode = mode;
      if (this.position !== null && mode !== 'normal') {
        animated = false;
        if (mode === 'headingup') {
          from = this.map.getView().getRotation() * 180 / Math.PI % 360;
          to = -this.direction % 360;
          diff = from - to;
          if (diff < -180) {
            diff = -360 - diff;
          }
          if (diff > 180) {
            diff = diff - 360;
          }
          if (Math.abs(diff) > 100) {
            d = 800;
          } else if (Math.abs(diff) > 60) {
            d = 400;
          } else {
            d = 300;
          }
          if (from - to !== 0) {
            animated = true;
            this.animations.moveMode = null;
            this.animations.rotationMode = {
              start: new Date(),
              from: diff,
              to: 0,
              duration: d,
              animate: function(frameStateTime) {
                var time;
                time = (frameStateTime - this.start) / this.duration;
                this.current = this.from + ((this.to - this.from) * ol.easing.easeOut(time));
                return time <= 1;
              }
            };
          }
        }
        if (!animated) {
          from = this.map.getView().getCenter();
          to = this.position;
          if (from[0] - to[0] !== 0 || from[1] - to[1] !== 0) {
            froms = [from[0] - to[0], from[1] - to[1]];
            if ((this.animations.moveMode != null) && this.animations.moveMode.animate()) {
              froms = [animations.current[0], animations.moveMode.current[1]];
            }
            this.animations.moveMode = {
              start: new Date(),
              from: froms,
              to: [0, 0],
              duration: 800,
              animate: function(frameStateTime) {
                var time;
                time = (frameStateTime - this.start) / this.duration;
                this.current = [this.from[0] + ((this.to[0] - this.from[0]) * ol.easing.easeOut(time)), this.from[1] + ((this.to[1] - this.from[1]) * ol.easing.easeOut(time))];
                return time <= 1;
              }
            };
          }
        }
        this.map.getView().setCenter(this.position);
      }
      if (mode === 'headingup') {
        this.map.getView().setRotation(-(this.direction / 180 * Math.PI));
      } else {
        this.map.render();
      }
      this.dispatch('change:mode', this.mode);
      return true;
    }
  };

  Kanimarker.prototype.setPosition = function(toPosition, accuracy, silent) {
    var fromPosition;
    if (silent == null) {
      silent = false;
    }
    if (((toPosition != null) && (this.position != null) && toPosition[0] === this.position[0] && toPosition[1] === this.position[1]) || ((toPosition == null) && (this.position == null))) {
      if (accuracy != null) {
        this.setAccuracy(accuracy, silent);
      }
      return;
    }
    if (accuracy != null) {
      this.setAccuracy(accuracy, true);
    }
    if (this.animations.move != null) {
      fromPosition = this.animations.move.current;
    } else {
      fromPosition = this.position;
    }
    this.position = toPosition;
    if (this.mode !== 'normal' && (toPosition != null)) {
      this.map.getView().setCenter(toPosition.slice());
    }
    if ((fromPosition != null) && (toPosition != null)) {
      this.animations.move = {
        start: new Date(),
        from: fromPosition.slice(),
        to: toPosition.slice(),
        duration: this.moveDuration,
        animate: function(frameStateTime) {
          var easing, time;
          time = (frameStateTime - this.start) / this.duration;
          if (this.duration > 8000) {
            easing = ol.easing.linear(time);
          } else if (this.duration > 2000) {
            easing = ol.easing.inAndOut(time);
          } else {
            easing = ol.easing.easeOut(time);
          }
          this.current = [this.from[0] + ((this.to[0] - this.from[0]) * easing), this.from[1] + ((this.to[1] - this.from[1]) * easing)];
          return time <= 1;
        }
      };
    }
    if ((fromPosition == null) && (toPosition != null)) {
      this.animations.fade = {
        start: new Date(),
        from: 0,
        to: 1,
        position: toPosition,
        animate: function(frameStateTime) {
          var time;
          time = (frameStateTime - this.start) / 500;
          this.current = this.from + ((this.to - this.from) * (function(x) {
            return x;
          })(time));
          return time <= 1;
        }
      };
    }
    if ((fromPosition != null) && (toPosition == null)) {
      if (this.mode !== 'normal') {
        this.setMode('normal');
      }
      this.animations.move = null;
      this.animations.fade = {
        start: new Date(),
        from: 1,
        to: 0,
        position: fromPosition,
        animate: function(frameStateTime) {
          var time;
          time = (frameStateTime - this.start) / 500;
          this.current = this.from + ((this.to - this.from) * (function(x) {
            return x;
          })(time));
          return time <= 1;
        }
      };
    }
    if (!silent) {
      return this.map.render();
    }
  };

  Kanimarker.prototype.setAccuracy = function(accuracy, silent) {
    var from;
    if (silent == null) {
      silent = false;
    }
    if (this.accuracy === accuracy) {
      return;
    }
    if ((this.animations.accuracy != null) && this.animations.accuracy.animate()) {
      from = this.animations.accuracy.current;
    } else {
      from = this.accuracy;
    }
    this.accuracy = accuracy;
    this.animations.accuracy = {
      start: new Date(),
      from: from,
      to: accuracy,
      duration: this.accuracyDuration,
      animate: function(frameStateTime) {
        var time;
        time = (frameStateTime - this.start) / this.duration;
        this.current = this.from + ((this.to - this.from) * ol.easing.easeOut(time));
        return time <= 1;
      }
    };
    if (!silent) {
      return this.map.render();
    }
  };

  Kanimarker.prototype.setHeading = function(direction, silent) {
    var diff;
    if (silent == null) {
      silent = false;
    }
    if (direction === void 0 || this.direction === direction) {
      return;
    }
    diff = this.direction - direction;
    if (diff < -180) {
      diff = -360 - diff;
    }
    if (diff > 180) {
      diff = diff - 360;
    }
    this.animations.heading = {
      start: new Date(),
      from: direction + diff,
      to: direction,
      animate: function(frameStateTime) {
        var time;
        time = (frameStateTime - this.start) / 500;
        this.current = this.from + ((this.to - this.from) * ol.easing.easeOut(time));
        return time <= 1;
      }
    };
    this.direction = direction;
    if (this.mode === 'headingup') {
      return this.map.getView().setRotation(-(this.direction / 180 * Math.PI));
    } else if (!silent) {
      return this.map.render();
    }
  };

  Kanimarker.prototype.postcompose_ = function(event) {
    var accuracy, accuracySize, circleStyle, context, diff, direction, frameState, iconStyle, maxSize, opacity, opacity_, pixel, pixelRatio, position, txt, vectorContext;
    context = event.context;
    vectorContext = event.vectorContext;
    frameState = event.frameState;
    pixelRatio = frameState.pixelRatio;
    opacity = 1;
    position = this.position;
    accuracy = this.accuracy;
    direction = this.direction;
    if (this.animations.move != null) {
      if (this.animations.move.animate(frameState.time)) {
        position = this.animations.move.current;
        frameState.animate = true;
      } else {
        this.animations.move = null;
      }
    }
    if (this.animations.fade != null) {
      if (this.animations.fade.animate(frameState.time)) {
        opacity = this.animations.fade.current;
        position = this.animations.fade.position;
        frameState.animate = true;
      } else {
        this.animations.fade = null;
      }
    }
    if (this.animations.heading != null) {
      if (this.animations.heading.animate(frameState.time)) {
        direction = this.animations.heading.current;
        frameState.animate = true;
      } else {
        this.animations.heading = null;
      }
    }
    if (this.animations.accuracy != null) {
      if (this.animations.accuracy.animate(frameState.time)) {
        accuracy = this.animations.accuracy.current;
        frameState.animate = true;
      } else {
        this.animations.accuracy = null;
      }
    }
    if (position != null) {
      accuracySize = accuracy / frameState.viewState.resolution;
      maxSize = Math.max(this.map.getSize()[0], this.map.getSize()[1]);
      if (accuracySize > 3 && accuracySize * pixelRatio < maxSize) {
        opacity_ = 0.2 * opacity;
        if (accuracySize < 30) {
          opacity_ = opacity_ * (accuracySize / 30);
        }
        if (accuracySize * pixelRatio > maxSize * 0.2) {
          diff = accuracySize * pixelRatio - maxSize * 0.2;
          opacity_ = opacity_ * (1 - diff / (maxSize * 0.4));
          if (opacity_ < 0) {
            opacity_ = 0;
          }
        }
        if (opacity_ > 0) {
          circleStyle = new ol.style.Circle({
            snapToPixel: false,
            radius: accuracySize * pixelRatio,
            fill: new ol.style.Fill({
              color: "rgba(56, 149, 255, " + opacity_ + ")"
            })
          });
          vectorContext.setImageStyle(circleStyle);
          vectorContext.drawPointGeometry(new ol.geom.Point(position), null);
        }
      }
      iconStyle = new ol.style.Circle({
        radius: 8 * pixelRatio,
        snapToPixel: false,
        fill: new ol.style.Fill({
          color: "rgba(0, 160, 233, " + opacity + ")"
        }),
        stroke: new ol.style.Stroke({
          color: "rgba(255, 255, 255, " + opacity + ")",
          width: 3 * pixelRatio
        })
      });
      vectorContext.setImageStyle(iconStyle);
      vectorContext.drawPointGeometry(new ol.geom.Point(position), null);
      context.save();
      if (this.mode !== 'normal') {
        if (this.animations.moveMode != null) {
          if (this.animations.moveMode.animate(frameState.time)) {
            position = position.slice();
            position[0] -= this.animations.moveMode.current[0];
            position[1] -= this.animations.moveMode.current[1];
            frameState.animate = true;
            pixel = this.map.getPixelFromCoordinate(position);
            context.translate(pixel[0] * pixelRatio, pixel[1] * pixelRatio);
          } else {
            this.animations.moveMode = null;
            context.translate(context.canvas.width / 2, context.canvas.height / 2);
          }
        } else {
          context.translate(context.canvas.width / 2, context.canvas.height / 2);
        }
      } else {
        pixel = this.map.getPixelFromCoordinate(position);
        context.translate(pixel[0] * pixelRatio, pixel[1] * pixelRatio);
      }
      context.rotate((direction / 180 * Math.PI) + frameState.viewState.rotation);
      context.scale(pixelRatio, pixelRatio);
      context.beginPath();
      context.moveTo(0, -20);
      context.lineTo(-7, -12);
      context.lineTo(7, -12);
      context.closePath();
      context.fillStyle = "rgba(0, 160, 233, " + opacity + ")";
      context.strokeStyle = "rgba(255, 255, 255, " + opacity + ")";
      context.lineWidth = 3;
      context.fill();
      context.restore();
    }
    if (this.debug_) {
      txt = 'Position:' + this.position + ' Heading:' + this.direction + ' Accuracy:' + this.accuracy + ' Mode:' + this.mode;
      if (this.animations.move != null) {
        txt += ' [Move]';
      }
      if (this.animations.heading != null) {
        txt += ' [Rotate]';
      }
      if (this.animations.accuracy != null) {
        txt += ' [Accuracy]';
      }
      if (this.animations.fade != null) {
        txt += ' [Fadein/Out]';
      }
      if (this.animations.rotationMode != null) {
        txt += ' [HeadingRotation]' + this.animations.rotationMode.current;
      }
      context.save();
      context.fillStyle = "rgba(255, 255, 255, 0.6)";
      context.fillRect(0, context.canvas.height - 20, context.canvas.width, 20);
      context.font = "10px";
      context.fillStyle = "black";
      context.fillText(txt, 10, context.canvas.height - 7);
      return context.restore();
    }
  };

  Kanimarker.prototype.precompose_ = function(event) {
    var diff, direction, frameState, position;
    if (this.position !== null && this.mode !== 'normal') {
      frameState = event.frameState;
      position = this.position;
      if (this.animations.move != null) {
        if (this.animations.move.animate(frameState.time)) {
          position = this.animations.move.current;
        } else {
          this.animations.move = null;
        }
      }
      if (this.animations.moveMode != null) {
        if (this.animations.moveMode.animate(frameState.time)) {
          position = position.slice();
          position[0] += this.animations.moveMode.current[0];
          position[1] += this.animations.moveMode.current[1];
          frameState.animate = true;
        } else {
          this.animations.moveMode = null;
        }
      }
      frameState.viewState.center[0] = position[0];
      frameState.viewState.center[1] = position[1];
      if (this.mode === 'headingup') {
        direction = this.direction;
        if (this.animations.heading != null) {
          if (this.animations.heading.animate(frameState.time)) {
            direction = this.animations.heading.current;
          } else {
            this.animations.heading = null;
          }
        }
        diff = 0;
        if (this.animations.rotationMode != null) {
          if (this.animations.rotationMode.animate(frameState.time)) {
            diff = this.animations.rotationMode.current;
            frameState.animate = true;
          } else {
            this.animations.rotationMode = null;
          }
        }
        return frameState.viewState.rotation = -((direction - diff) / 180 * Math.PI);
      }
    }
  };

  Kanimarker.prototype.pointerdrag_ = function() {
    if (this.mode !== 'normal') {
      return this.setMode('normal');
    }
  };

  Kanimarker.prototype.on = function(type, listener) {
    var base;
    (base = this.callbacks)[type] || (base[type] = []);
    this.callbacks[type].push(listener);
    return this;
  };

  Kanimarker.prototype.dispatch = function(type, data) {
    var callback, chain, i, len, results;
    chain = this.callbacks[type];
    if (chain != null) {
      results = [];
      for (i = 0, len = chain.length; i < len; i++) {
        callback = chain[i];
        results.push(callback(data));
      }
      return results;
    }
  };

  return Kanimarker;

})();

if (typeof exports !== 'undefined') {
  module.exports = Kanimarker;
}

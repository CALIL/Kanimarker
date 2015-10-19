
/*

Kanimarker

Copyright (c) 2015 CALIL Inc.
This software is released under the MIT License.
http://opensource.org/licenses/mit-license.php
 */
var Kanimarker;

Kanimarker = (function() {
  Kanimarker.prototype.map = null;

  Kanimarker.prototype.headingUp = false;

  Kanimarker.prototype.position = null;

  Kanimarker.prototype.direction = 0;

  Kanimarker.prototype.accuracy = 0;

  Kanimarker.prototype.moveAnimationState_ = null;

  Kanimarker.prototype.directionAnimationState_ = null;

  Kanimarker.prototype.accuracyAnimationState_ = null;

  Kanimarker.prototype.fadeInOutAnimationState_ = null;

  Kanimarker.prototype.debug_ = false;

  Kanimarker.prototype.callbacks = {};

  Kanimarker.prototype.moveDuration = 2000;

  Kanimarker.prototype.accuracyDuration = 2000;

  function Kanimarker(map) {
    this.map = map;
    this.map.on('postcompose', this.postcompose_, this);
    this.map.on('precompose', this.precompose_, this);
    this.map.on('pointerdrag', this.pointerdrag_, this);
  }

  Kanimarker.prototype.cancelAnimation = function() {
    this.moveAnimationState_ = null;
    this.directionAnimationState_ = null;
    this.accuracyAnimationState_ = null;
    return this.fadeInOutAnimationState_ = null;
  };

  Kanimarker.prototype.showDebugInfomation = function(newValue) {
    this.debug_ = newValue;
    return this.map.render();
  };

  Kanimarker.prototype.setHeadingUp = function(newValue) {
    if (this.headingUp !== newValue) {
      if (newValue === true && (this.position == null)) {
        return;
      }
      this.headingUp = newValue;
      this.cancelAnimation();
      if (this.position != null) {
        this.map.getView().setCenter(this.position.slice());
      }
      if (this.direction != null) {
        this.map.getView().setRotation(-(this.direction / 180 * Math.PI));
      }
      this.map.render();
      return this.dispatch('change:headingup', newValue);
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
    if (this.moveAnimationState_ != null) {
      fromPosition = this.moveAnimationState_.current;
    } else {
      fromPosition = this.position;
    }
    this.position = toPosition;
    if (this.headingUp && (toPosition != null)) {
      this.map.getView().setCenter(toPosition.slice());
    }
    if ((fromPosition != null) && (toPosition != null)) {
      this.moveAnimationState_ = {
        start: new Date(),
        from: fromPosition.slice(),
        current: fromPosition.slice(),
        to: toPosition.slice(),
        duration: this.moveDuration,
        animate: function(frameStateTime) {
          var time;
          time = (frameStateTime - this.start) / this.duration;
          if (time <= 1) {
            if (this.duration > 8000) {
              this.current[0] = this.from[0] + ((this.to[0] - this.from[0]) * ol.easing.linear(time));
              this.current[1] = this.from[1] + ((this.to[1] - this.from[1]) * ol.easing.linear(time));
            } else if (this.duration > 2000) {
              this.current[0] = this.from[0] + ((this.to[0] - this.from[0]) * ol.easing.inAndOut(time));
              this.current[1] = this.from[1] + ((this.to[1] - this.from[1]) * ol.easing.inAndOut(time));
            } else {
              this.current[0] = this.from[0] + ((this.to[0] - this.from[0]) * ol.easing.easeOut(time));
              this.current[1] = this.from[1] + ((this.to[1] - this.from[1]) * ol.easing.easeOut(time));
            }
            return true;
          } else {
            return false;
          }
        }
      };
    }
    if ((fromPosition == null) && (toPosition != null)) {
      this.fadeInOutAnimationState_ = {
        start: new Date(),
        from: 0,
        current: 0,
        to: 1,
        animationPosition: toPosition,
        animate: function(frameStateTime) {
          var time;
          time = (frameStateTime - this.start) / 500;
          if (time <= 1) {
            this.current = this.from + ((this.to - this.from) * (function(x) {
              return x;
            })(time));
            return true;
          } else {
            return false;
          }
        }
      };
    }
    if ((fromPosition != null) && (toPosition == null)) {
      if (this.headingUp) {
        this.setHeadingUp(false);
      }
      this.moveAnimationState_ = null;
      this.fadeInOutAnimationState_ = {
        start: new Date(),
        from: 1,
        current: 1,
        to: 0,
        animationPosition: fromPosition,
        animate: function(frameStateTime) {
          var time;
          time = (frameStateTime - this.start) / 500;
          if (time <= 1) {
            this.current = this.from + ((this.to - this.from) * (function(x) {
              return x;
            })(time));
            return true;
          } else {
            return false;
          }
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
    if (this.accuracyAnimationState_ != null) {
      from = this.accuracyAnimationState_.current;
    } else {
      from = this.accuracy;
    }
    this.accuracy = accuracy;
    this.accuracyAnimationState_ = {
      start: new Date(),
      from: from,
      to: accuracy,
      current: from,
      duration: this.accuracyDuration,
      animate: function(frameStateTime) {
        var time;
        time = (frameStateTime - this.start) / this.duration;
        if (time <= 1) {
          this.current = this.from + ((this.to - this.from) * ol.easing.easeOut(time));
          return true;
        } else {
          return false;
        }
      }
    };
    if (!silent) {
      return this.map.render();
    }
  };

  Kanimarker.prototype.setDirection = function(newDirection, silent) {
    var n, virtualDirection;
    if (silent == null) {
      silent = false;
    }
    if (newDirection === void 0 || this.direction === newDirection) {
      return;
    }
    if (newDirection > this.direction) {
      n = newDirection - this.direction;
      if (n <= 180) {
        virtualDirection = this.direction + n;
      } else {
        virtualDirection = this.direction - (360 - n);
      }
    } else {
      n = this.direction - newDirection;
      if (n <= 180) {
        virtualDirection = this.direction - n;
      } else {
        virtualDirection = this.direction + (360 - n);
      }
    }
    this.directionAnimationState_ = {
      start: new Date(),
      from: this.direction,
      current: this.direction,
      to: virtualDirection,
      animate: function(frameStateTime) {
        var time;
        time = (frameStateTime - this.start) / 500;
        if (time <= 1) {
          this.current = this.from + ((this.to - this.from) * ol.easing.easeOut(time));
          return true;
        } else {
          return false;
        }
      }
    };
    this.direction = newDirection;
    if (this.headingUp) {
      this.map.getView().setRotation(-(newDirection / 180 * Math.PI));
    }
    if (!silent) {
      return this.map.render();
    }
  };

  Kanimarker.prototype.postcompose_ = function(event) {
    var accuracy, circleStyle, context, debugText, direction, frameState, iconStyle, opacity, pixel, pixelRatio, position, vectorContext;
    context = event.context;
    vectorContext = event.vectorContext;
    frameState = event.frameState;
    pixelRatio = frameState.pixelRatio;
    opacity = 1;
    position = this.position;
    accuracy = this.accuracy;
    direction = this.direction;
    if (this.moveAnimationState_ != null) {
      if (this.moveAnimationState_.animate(frameState.time)) {
        position = this.moveAnimationState_.current;
        frameState.animate = true;
      } else {
        this.moveAnimationState_ = null;
      }
    }
    if (this.fadeInOutAnimationState_ != null) {
      if (this.fadeInOutAnimationState_.animate(frameState.time)) {
        opacity = this.fadeInOutAnimationState_.current;
        position = this.fadeInOutAnimationState_.animationPosition;
        frameState.animate = true;
      } else {
        this.fadeInOutAnimationState_ = null;
      }
    }
    if (this.directionAnimationState_ != null) {
      if (this.directionAnimationState_.animate(frameState.time)) {
        direction = this.directionAnimationState_.current;
        frameState.animate = true;
      } else {
        this.directionAnimationState_ = null;
      }
    }
    if (this.accuracyAnimationState_ != null) {
      if (this.accuracyAnimationState_.animate(frameState.time)) {
        accuracy = this.accuracyAnimationState_.current;
        frameState.animate = true;
      } else {
        this.accuracyAnimationState_ = null;
      }
    }
    if (position != null) {
      if ((accuracy / frameState.viewState.resolution) * pixelRatio > 15) {
        circleStyle = new ol.style.Circle({
          snapToPixel: false,
          radius: (accuracy / frameState.viewState.resolution) * pixelRatio,
          fill: new ol.style.Fill({
            color: "rgba(56, 149, 255, " + (0.2 * opacity) + ")"
          })
        });
        vectorContext.setImageStyle(circleStyle);
        vectorContext.drawPointGeometry(new ol.geom.Point(position), null);
      }
      iconStyle = new ol.style.Circle({
        radius: 8 * pixelRatio,
        snapToPixel: false,
        fill: new ol.style.Fill({
          color: "rgba(0, 160, 233, " + (1.0 * opacity) + ")"
        }),
        stroke: new ol.style.Stroke({
          color: "rgba(255, 255, 255, " + (1.0 * opacity) + ")",
          width: 3 * pixelRatio
        })
      });
      vectorContext.setImageStyle(iconStyle);
      vectorContext.drawPointGeometry(new ol.geom.Point(position), null);
      context.save();
      if (this.headingUp) {
        context.translate(context.canvas.width / 2, context.canvas.height / 2);
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
      context.fillStyle = "rgba(0, 160, 233, " + (1.0 * opacity) + ")";
      context.strokeStyle = "rgba(255, 255, 255, " + (1.0 * opacity) + ")";
      context.lineWidth = 3;
      context.fill();
      context.restore();
    }
    if (this.debug_) {
      debugText = JSON.stringify({
        '現在地': kanimarker.position,
        '方向': kanimarker.direction,
        '計測精度': kanimarker.accuracy,
        'モード': kanimarker.headingUp ? '追従モード' : 'ビューモード',
        '移動': (kanimarker.moveAnimationState_ != null) ? 'アニメーション中' : 'アニメーションなし',
        '回転': (kanimarker.directionAnimationState_ != null) ? 'アニメーション中' : 'アニメーションなし',
        '計測精度': (kanimarker.accuracyAnimationState_ != null) ? 'アニメーション中' : 'アニメーションなし',
        'フェードイン・アウト': (kanimarker.fadeInOutAnimationState_ != null) ? 'アニメーション中' : 'アニメーションなし'
      }, null, 2);
      context.save();
      context.fillStyle = "rgba(255, 255, 255, 0.6)";
      context.fillRect(0, context.canvas.height - 20, context.canvas.width, 20);
      context.font = "10px";
      context.fillStyle = "black";
      context.fillText(debugText, 10, context.canvas.height - 7);
      return context.restore();
    }
  };

  Kanimarker.prototype.precompose_ = function(event) {
    var direction, frameState, position;
    if ((this.position != null) && this.headingUp) {
      frameState = event.frameState;
      position = this.position;
      direction = this.direction;
      if (this.moveAnimationState_ != null) {
        if (this.moveAnimationState_.animate(frameState.time)) {
          position = this.moveAnimationState_.current;
        }
      }
      if (this.directionAnimationState_ != null) {
        if (this.directionAnimationState_.animate(frameState.time)) {
          direction = this.directionAnimationState_.current;
        }
      }
      frameState.viewState.center[0] = position[0];
      frameState.viewState.center[1] = position[1];
      return frameState.viewState.rotation = -(direction / 180 * Math.PI);
    }
  };

  Kanimarker.prototype.pointerdrag_ = function() {
    if (this.headingUp) {
      return this.setHeadingUp(false);
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

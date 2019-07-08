(function (define) {
	'use strict';

	(function (root, factory) {
		if (typeof define === 'function' && define.amd) {
			define(factory);
		} else if (typeof exports === 'object') {
			module.exports = factory();
		} else {
			root.TreeView = factory();
		}
	}(window, function () {
		return (function () {

			/** List of events supported by the tree view */
			var events = [
				'expand',
				'init',
				'expandAll',
				'collapse',
				'collapseAll',
				'selectNode',
				'select'
			];

			/**
			 * A utilite function to check to see if something is a DOM object
			 * @param {object} Object to test
			 * @returns {boolean} If the object is a DOM object
			 */
			function isDOMElement(obj) {
				try {
					return obj instanceof HTMLElement;
				} catch (e) {
					// Some browsers don't support using the HTMLElement so some extra
					// checks are needed.
					return typeof obj === 'object' && obj.nodeType === 1 && typeof obj.style === 'object' && typeof obj.ownerDocument === 'object';
				}
			}

			/**
			 * A forEach that will work with a NodeList and generic Arrays
			 * @param {array|NodeList} arr The array to iterate over
			 * @param {function} callback Function that executes for each element. First parameter is element, second is index
			 * @param {object} The context to execute callback with
			 */
			function forEach(arr, callback, scope) {
				var i, len = arr.length;
				for (i = 0; i < len; i += 1) {
					callback.call(scope, arr[i], i);
				}
			}

			/**
			 * Emit an event from the tree view
			 * @param {string} name The name of the event to emit
			 */
			function emit(instance, name) {
				var args = [].slice.call(arguments, 2);
				if (events.indexOf(name) > -1) {
					if (instance.handlers[name] && instance.handlers[name] instanceof Array) {
						forEach(instance.handlers[name], function (handle) {
							window.setTimeout(function () {
								handle.callback.apply(handle.context, args);
							}, 0);
						});
					}
				} else {
					throw new Error(name + ' event cannot be found on TreeView.');
				}
			}

			/**
			 * Renders the tree view in the DOM
			 */
			function render(self) {
				var container = isDOMElement(self.node) ? self.node : document.getElementById(self.node);
				var clonedContainer;
				if (container) {
					clonedContainer = container.cloneNode(true);
					container.parentNode.replaceChild(clonedContainer, container);
					var leaves = [],
						clickExpandIcon,
						click;

					var renderLeaf = function (item) {
						var leaf = document.createElement('div');
						var content = document.createElement('div');
						var icon = document.createElement('mat-icon');

						var text = document.createElement('div');
						var expando = document.createElement('div');

						leaf.setAttribute('class', 'tree-leaf');
						content.setAttribute('class', 'tree-leaf-content');
						icon.setAttribute('class', 'tree-icon mat-icon material-icons');
						content.setAttribute('data-item', JSON.stringify(item));
						text.setAttribute('class', 'tree-leaf-text');
						text.setAttribute('id', item.id);

						if (item.isLeaf) {
							icon.classList.add('is-leaf');
							icon.textContent = 'web_asset';
						} else {
							icon.textContent = item.expanded ? 'folder' : 'folder_open';
						}

						text.textContent = item.name;
						expando.setAttribute('class', 'tree-expando ' + (item.expanded ? 'expanded' : ''));
						expando.textContent = item.expanded ? '-' : '+';
						content.appendChild(expando);
						content.appendChild(icon);
						content.appendChild(text);
						leaf.appendChild(content);
						if (item.children && item.children.length > 0) {
							var children = document.createElement('div');
							children.setAttribute('class', 'tree-child-leaves');
							forEach(item.children, function (child) {
								var childLeaf = renderLeaf(child);
								children.appendChild(childLeaf);
							});
							if (!item.expanded) {
								children.classList.add('hidden');
							}
							leaf.appendChild(children);
						} else {
							expando.classList.add('hidden');
						}
						return leaf;
					};

					forEach(self.data, function (item) {
						leaves.push(renderLeaf.call(self, item));
					});
					clonedContainer.innerHTML = leaves.map(function (leaf) {
						return leaf.outerHTML;
					}).join('');

					click = function (e) {
						console.log("TCL: click -> e", e)

						var parent = (e.target || e.currentTarget).parentNode;
						forEach(clonedContainer.querySelectorAll('.tree-leaf-text'), function (node) {
							var parent = node.parentNode;
							parent.classList.remove("selected");
						});
						parent.classList.add("selected");

						var data = JSON.parse(parent.getAttribute('data-item'));
						var leaves = parent.parentNode.querySelector('.tree-child-leaves');
						if (leaves) {
							// 	if (leaves.classList.contains('hidden')) {
							// 		self.expand(parent, leaves);
							// 	} else {
							// 		self.collapse(parent, leaves);
							// 	}
						} else {

						}
						emit(self, 'select', {
							target: e,
							data: data
						});
					};

					clickExpandIcon = function (e) {
						var parent = (e.target || e.currentTarget).parentNode;
						var data = JSON.parse(parent.getAttribute('data-item'));
						var leaves = parent.parentNode.querySelector('.tree-child-leaves');
						if (leaves) {
							if (leaves.classList.contains('hidden')) {
								self.expand(parent, leaves);
							} else {
								self.collapse(parent, leaves);
							}
						} else {
							emit(self, 'select', {
								target: e,
								data: data
							});
						}
					};

					forEach(clonedContainer.querySelectorAll('.tree-icon'), function (node) {
						node.onclick = click;
					});

					forEach(clonedContainer.querySelectorAll('.tree-leaf-text'), function (node) {
						node.onclick = click;
					});

					forEach(clonedContainer.querySelectorAll('.tree-expando'), function (node) {
						node.onclick = clickExpandIcon;
					});
				}

			}

			/**
			 * @constructor
			 * @property {object} handlers The attached event handlers
			 * @property {object} data The JSON object that represents the tree structure
			 * @property {DOMElement} node The DOM element to render the tree in
			 */
			function TreeView(data, node) {
				this.handlers = {};
				this.node = node;
				this.data = data;
				render(this);

				var self = this;
				setTimeout(function() {
					emit(self, 'init', {});
				});
				
			}

			/**
			 * Expands a leaflet by the expando or the leaf text
			 * @param {DOMElement} node The parent node that contains the leaves
			 * @param {DOMElement} leaves The leaves wrapper element
			 */
			TreeView.prototype.expand = function (node, leaves, skipEmit) {
				var expando = node.querySelector('.tree-expando');
				expando.textContent = '-';
				var icon = node.querySelector('.tree-icon');
				// icon.setAttribute('class', 'tree-icon mat-icon material-icons expanded');
				icon.textContent = 'folder_open';
				leaves.classList.remove('hidden');
				if (skipEmit) {
					return;
				}
				emit(this, 'expand', {
					target: node,
					leaves: leaves
				});
			};

			TreeView.prototype.expandAll = function () {
				var self = this;
				var el = document.getElementById(self.node);
				if (el) {
					var nodes = el.querySelectorAll('.tree-expando');
					forEach(nodes, function (node) {
						var parent = node.parentNode;
						var leaves = parent.parentNode.querySelector('.tree-child-leaves');
						if (parent && leaves && parent.hasAttribute('data-item')) {
							self.expand(parent, leaves, true);
						}
					});
					emit(this, 'expandAll', {});
				}
			};

			TreeView.prototype.selectNode = function (nodeId) {
				var self = this;
				var el = document.getElementById(self.node);
				if (el) {
					var nodes = el.querySelectorAll('.tree-leaf-text');
					if (nodes) {
						var currentNode;
						forEach(nodes, function (node) {
							if (node.id === nodeId.toString()) {
								currentNode = node;
							}
						});
						if (currentNode) {
							currentNode.click();
						}
					}
				}
			};

			/**
			 * Collapses a leaflet by the expando or the leaf text
			 * @param {DOMElement} node The parent node that contains the leaves
			 * @param {DOMElement} leaves The leaves wrapper element
			 */
			TreeView.prototype.collapse = function (node, leaves, skipEmit) {
				var expando = node.querySelector('.tree-expando');
				expando.textContent = '+';
				var icon = node.querySelector('.tree-icon');
				// icon.setAttribute('class', 'tree-icon mat-icon material-icons');
				icon.textContent = 'folder';
				leaves.classList.add('hidden');
				if (skipEmit) {
					return;
				}
				emit(this, 'collapse', {
					target: node,
					leaves: leaves
				});
			};

			/**
			 */
			TreeView.prototype.collapseAll = function () {
				var self = this;
				var nodes = document.getElementById(self.node).querySelectorAll('.tree-expando');
				forEach(nodes, function (node) {
					var parent = node.parentNode;
					var leaves = parent.parentNode.querySelector('.tree-child-leaves');
					if (parent && leaves && parent.hasAttribute('data-item')) {
						self.collapse(parent, leaves, true);
					}
				});
				emit(this, 'collapseAll', {});
			};

			/**
			 * Attach an event handler to the tree view
			 * @param {string} name Name of the event to attach
			 * @param {function} callback The callback to execute on the event
			 * @param {object} scope The context to call the callback with
			 */
			TreeView.prototype.on = function (name, callback, scope) {
				if (events.indexOf(name) > -1) {
					if (!this.handlers[name]) {
						this.handlers[name] = [];
					}
					this.handlers[name].push({
						callback: callback,
						context: scope
					});
				} else {
					throw new Error(name + ' is not supported by TreeView.');
				}
			};

			/**
			 * Deattach an event handler from the tree view
			 * @param {string} name Name of the event to deattach
			 * @param {function} callback The function to deattach
			 */
			TreeView.prototype.off = function (name, callback) {
				var index, found = false;
				if (this.handlers[name] instanceof Array) {
					this.handlers[name].forEach(function (handle, i) {
						index = i;
						if (handle.callback === callback && !found) {
							found = true;
						}
					});
					if (found) {
						this.handlers[name].splice(index, 1);
					}
				}
			};

			return TreeView;
		}());
	}));
}(window.define));

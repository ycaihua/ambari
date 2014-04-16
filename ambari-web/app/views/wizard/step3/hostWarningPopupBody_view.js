/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');
var lazyloading = require('utils/lazy_loading');
var numberUtils = require('utils/number_utils');

App.WizardStep3HostWarningPopupBody = Em.View.extend({

  templateName: require('templates/wizard/step3/step3_host_warnings_popup'),

  classNames: ['host-check'],

  bodyControllerBinding: 'App.router.wizardStep3Controller',

  /**
   * Listbox with host filters
   * @type {Ember.Select}
   */
  hostSelectView: Em.Select.extend({

    selectionBinding: "parentView.category",

    /**
     * Content has default value "All Hosts" to bind selection to category
     * @type {string[]}
     */
    content: ['All Hosts'],

    /**
     * List of filtered hostnames
     * @type {string[]}
     */
    hosts: function () {
      return this.get('parentView.warningsByHost').mapProperty('name');
    }.property('parentView.warningsByHost'),

    /**
     * Is data loaded
     * @type {bool}
     */
    isLoaded: false,

    didInsertElement: function () {
      this.initContent();
    },

    /**
     * Check browser and set content for listbox
     * @method initContent
     */
    initContent: function () {
      this.set('isLoaded', false);
      //The lazy loading for select elements supported only by Firefox and Chrome
      var isBrowserSupported = $.browser.mozilla || ($.browser.safari && navigator.userAgent.indexOf('Chrome') !== -1);
      var isLazyLoading = isBrowserSupported && this.get('hosts').length > 100;
      this.set('isLazyLoading', isLazyLoading);
      if (isLazyLoading) {
        //select need at least 30 hosts to have scrollbar
        this.set('content', this.get('hosts').slice(0, 30));
      } else {
        this.set('content', this.get('hosts'));
        this.set('isLoaded', true);
      }
    }.observes('parentView.warningsByHost'),

    /**
     * On click start lazy loading
     * @method click
     */
    click: function () {
      if (!this.get('isLoaded') && this.get('isLazyLoading')) {
        //filter out hosts, which already pushed in select
        var source = this.get('hosts').filter(function (_host) {
          return !this.get('content').contains(_host);
        }, this).slice();
        lazyloading.run({
          destination: this.get('content'),
          source: source,
          context: this,
          initSize: 30,
          chunkSize: 200,
          delay: 50
        });
      }
    }
  }),

  /**
   * List of warnings grouped by host
   * Same to <code>bodyController.warningsByHost</code>
   * @type {Ember.Enumerable}
   */
  warningsByHost: function () {
    return this.get('bodyController.warningsByHost');
  }.property('bodyController.warningsByHost'),

  /**
   * List of all warnings
   * Same to <code>bodyController.warnings</code>
   * @type {Ember.Enumerable}
   */
  warnings: function () {
    return this.get('bodyController.warnings');
  }.property('bodyController.warnings'),

  /**
   * Selected category
   * @type {string}
   */
  category: 'All Hosts',

  /**
   * List of warnings for selected <code>category</code>
   * @type {Ember.Enumerable}
   */
  categoryWarnings: function () {
    return this.get('warningsByHost').findProperty('name', this.get('category')).warnings
  }.property('warningsByHost', 'category'),

  /**
   * List of warnings grouped by <code>category</code>
   * @type {Ember.Object[]}
   */
  content: function () {
    var repoCategoryWarnings = this.get('bodyController.repoCategoryWarnings');
    var diskCategoryWarnings = this.get('bodyController.diskCategoryWarnings');
    var categoryWarnings = this.get('categoryWarnings');
    return [
      Em.Object.create({
        warnings: diskCategoryWarnings,
        title: Em.I18n.t('installer.step3.hostWarningsPopup.disk'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.disk.message'),
        type: Em.I18n.t('common.issues'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.empty.disk'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.exists'),
        category: 'disk',
        isCollapsed: true
      }),
      Em.Object.create({
        warnings: repoCategoryWarnings,
        title: Em.I18n.t('installer.step3.hostWarningsPopup.repositories'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.repositories.message'),
        type: Em.I18n.t('common.issues'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.empty.repositories'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.invalid'),
        category: 'repositories',
        isCollapsed: true
      }),
      Em.Object.create({
        warnings: categoryWarnings.filterProperty('category', 'firewall'),
        title: Em.I18n.t('installer.step3.hostWarningsPopup.firewall'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.firewall.message'),
        type: Em.I18n.t('common.issues'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.empty.firewall'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.running'),
        category: 'firewall',
        isCollapsed: true
      }),
      Em.Object.create({
        warnings: categoryWarnings.filterProperty('category', 'processes'),
        title: Em.I18n.t('installer.step3.hostWarningsPopup.process'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.processes.message'),
        type: Em.I18n.t('common.process'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.empty.processes'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.running'),
        category: 'process',
        isCollapsed: true
      }),
      Em.Object.create({
        warnings: categoryWarnings.filterProperty('category', 'packages'),
        title: Em.I18n.t('installer.step3.hostWarningsPopup.package'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.packages.message'),
        type: Em.I18n.t('common.package'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.empty.packages'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.installed'),
        category: 'package',
        isCollapsed: true
      }),
      Em.Object.create({
        warnings: categoryWarnings.filterProperty('category', 'fileFolders'),
        title: Em.I18n.t('installer.step3.hostWarningsPopup.fileAndFolder'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.fileFolders.message'),
        type: Em.I18n.t('common.path'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.empty.filesAndFolders'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.exists'),
        category: 'fileFolders',
        isCollapsed: true
      }),
      Em.Object.create({
        warnings: categoryWarnings.filterProperty('category', 'services'),
        title: Em.I18n.t('installer.step3.hostWarningsPopup.service'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.services.message'),
        type: Em.I18n.t('common.service'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.empty.services'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.notRunning'),
        category: 'service',
        isCollapsed: true
      }),
      Em.Object.create({
        warnings: categoryWarnings.filterProperty('category', 'users'),
        title: Em.I18n.t('installer.step3.hostWarningsPopup.user'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.users.message'),
        type: Em.I18n.t('common.user'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.empty.users'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.exists'),
        category: 'user',
        isCollapsed: true
      }),
      Em.Object.create({
        warnings: categoryWarnings.filterProperty('category', 'misc'),
        title: Em.I18n.t('installer.step3.hostWarningsPopup.misc'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.misc.message'),
        type: Em.I18n.t('installer.step3.hostWarningsPopup.misc.umask'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.empty.misc'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.exists'),
        category: 'misc',
        isCollapsed: true
      }),
      Em.Object.create({
        warnings: categoryWarnings.filterProperty('category', 'alternatives'),
        title: Em.I18n.t('installer.step3.hostWarningsPopup.alternatives'),
        message: Em.I18n.t('installer.step3.hostWarningsPopup.alternatives.message'),
        type: Em.I18n.t('installer.step3.hostWarningsPopup.alternatives.umask'),
        emptyName: Em.I18n.t('installer.step3.hostWarningsPopup.alternatives.emptyinstaller.step3.hostWarningsPopup.alternatives.empty'),
        action: Em.I18n.t('installer.step3.hostWarningsPopup.action.exists'),
        category: 'alternatives',
        isCollapsed: true
      })
    ]
  }.property('category', 'warningsByHost'),

  /**
   * Message with info about warnings
   * @return {string}
   */
  warningsNotice: function () {
    var issuesNumber = this.get('warnings.length') + this.get('bodyController.repoCategoryWarnings.length') + this.get('bodyController.diskCategoryWarnings.length');
    var issues = issuesNumber + ' ' + (issuesNumber.length === 1 ? Em.I18n.t('installer.step3.hostWarningsPopup.issue') : Em.I18n.t('installer.step3.hostWarningsPopup.issues'));
    var hostsCnt = this.warningHostsNamesCount();
    var hosts = hostsCnt + ' ' + (hostsCnt === 1 ? Em.I18n.t('installer.step3.hostWarningsPopup.host') : Em.I18n.t('installer.step3.hostWarningsPopup.hosts'));
    return Em.I18n.t('installer.step3.hostWarningsPopup.summary').format(issues, hosts);
  }.property('warnings', 'warningsByHost'),

  /**
   * Detailed content to show it in new window
   * @return {string}
   */
  contentInDetails: function () {
    var content = this.get('content');
    var warningsByHost = this.get('warningsByHost').slice();
    warningsByHost.shift();
    var newContent = '';
    newContent += Em.I18n.t('installer.step3.hostWarningsPopup.report.header') + new Date;
    newContent += Em.I18n.t('installer.step3.hostWarningsPopup.report.hosts');
    newContent += warningsByHost.filterProperty('warnings.length').mapProperty('name').join(' ');
    if (content.findProperty('category', 'firewall').warnings.length) {
      newContent += Em.I18n.t('installer.step3.hostWarningsPopup.report.firewall');
      newContent += content.findProperty('category', 'firewall').warnings.mapProperty('name').join('<br>');
    }
    if (content.findProperty('category', 'fileFolders').warnings.length) {
      newContent += Em.I18n.t('installer.step3.hostWarningsPopup.report.fileFolders');
      newContent += content.findProperty('category', 'fileFolders').warnings.mapProperty('name').join(' ');
    }
    if (content.findProperty('category', 'process').warnings.length) {
      newContent += Em.I18n.t('installer.step3.hostWarningsPopup.report.process');
      content.findProperty('category', 'process').warnings.forEach(function (process, i) {
        process.hosts.forEach(function (host, j) {
          if (!!i || !!j) {
            newContent += ',';
          }
          newContent += '(' + host + ',' + process.user + ',' + process.pid + ')';
        });
      });
    }
    if (content.findProperty('category', 'package').warnings.length) {
      newContent += Em.I18n.t('installer.step3.hostWarningsPopup.report.package');
      newContent += content.findProperty('category', 'package').warnings.mapProperty('name').join(' ');
    }
    if (content.findProperty('category', 'service').warnings.length) {
      newContent += Em.I18n.t('installer.step3.hostWarningsPopup.report.service');
      newContent += content.findProperty('category', 'service').warnings.mapProperty('name').join(' ');
    }
    if (content.findProperty('category', 'user').warnings.length) {
      newContent += Em.I18n.t('installer.step3.hostWarningsPopup.report.user');
      newContent += content.findProperty('category', 'user').warnings.mapProperty('name').join(' ');
    }
    newContent += '</p>';
    return newContent;
  }.property('content', 'warningsByHost'),

  didInsertElement: function () {
    Em.run.next(this, function () {
      App.tooltip(this.$("[rel='HostsListTooltip']"), {html: true, placement: "right"});
      App.tooltip(this.$('#process .warning-name'), {html: true, placement: "top"});
    });
  }.observes('content'),

  /**
   * Show popup with selected hostnames
   * @param {object} hosts
   * @method showHostsPopup
   */
  showHostsPopup: function (hosts) {
    $('.tooltip').hide();
    App.ModalPopup.show({
      header: Em.I18n.t('installer.step3.hostWarningsPopup.allHosts'),
      bodyClass: Em.View.extend({
        hosts: hosts.context,
        template: Em.Handlebars.compile('<ul>{{#each host in view.hosts}}<li>{{host}}</li>{{/each}}</ul>')
      }),
      secondary: null
    });
  },

  /**
   * Open/Close selected category
   * @param {object} category
   * @method onToggleBlock
   */
  onToggleBlock: function (category) {
    this.$('#' + category.context.category).toggle('blind', 500);
    category.context.set("isCollapsed", !category.context.get("isCollapsed"));
  },

  /**
   * Generate number of hosts which had warnings, avoid duplicated host names in different warnings.
   * @method warningHostsNamesCount
   * @return {number}
   */
  warningHostsNamesCount: function () {
    var hostNameMap = Em.Object.create();
    var warningsByHost = this.get('bodyController.warningsByHost').slice();
    warningsByHost.shift();
    warningsByHost.forEach(function (_host) {
      if (_host.warnings.length) {
        hostNameMap[_host.name] = true;
      }
    });
    var repoCategoryWarnings = this.get('bodyController.repoCategoryWarnings');
    var diskCategoryWarnings = this.get('bodyController.diskCategoryWarnings');

    if (repoCategoryWarnings.length) {
      repoCategoryWarnings[0].hostsNames.forEach(function (_hostName) {
        if (!hostNameMap[_hostName]) {
          hostNameMap[_hostName] = true;
        }
      });
    }
    if (diskCategoryWarnings.length) {
      diskCategoryWarnings[0].hostsNames.forEach(function (_hostName) {
        if (!hostNameMap[_hostName]) {
          hostNameMap[_hostName] = true;
        }
      });
    }
    return Em.keys(hostNameMap).length;
  },

  /**
   * Open new browser tab with detailed content
   * @method openWarningsInDialog
   */
  openWarningsInDialog: function () {
    var newWindow = window.open('');
    var newDocument = newWindow.document;
    newDocument.write(this.get('contentInDetails'));
    newWindow.focus();
  }

});
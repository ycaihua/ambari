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

App.WizardStep3Controller = Em.Controller.extend({

  name: 'wizardStep3Controller',

  hosts: [],

  content: [],

  bootHosts: [],

  registeredHosts: [],

  repoCategoryWarnings: [],

  diskCategoryWarnings: [],

  registrationStartedAt: null,

  /**
   * Timeout for registration
   * Based on <code>installOptions.manualInstall</code>
   * @type {number}
   */
  registrationTimeoutSecs: function () {
    return this.get('content.installOptions.manualInstall') ? 15 : 120;
  }.property('content.installOptions.manualInstall'),

  /**
   * Bootstrap calls are stopped
   * @type {bool}
   */
  stopBootstrap: false,

  /**
   * is Submit button disabled
   * @type {bool}
   */
  isSubmitDisabled: true,

  /**
   * is Retry button disabled
   * @type {bool}
   */
  isRetryDisabled: true,

  /**
   * @type {bool}
   */
  isLoaded: false,

  /**
   * Polls count
   * @type {number}
   */
  numPolls: 0,

  /**
   * Is hosts registration in progress
   * @type {bool}
   */
  isRegistrationInProgress: true,

  /**
   * Are some registered hosts which are not added by user
   * @type {bool}
   */
  hasMoreRegisteredHosts: false,

  /**
   * List of installed hostnames
   * @type {string[]}
   */
  hostsInCluster: function () {
    return App.Host.find().getEach('hostName');
  }.property().volatile(),

  /**
   * All hosts warnings
   * @type {object[]}
   */
  warnings: [],

  /**
   * Warnings grouped by host
   * @type {Ember.Enumerable}
   */
  warningsByHost: [],

  /**
   * Timeout for "warning"-requests
   * @type {number}
   */
  warningsTimeInterval: 60000,

  /**
   * Are hosts warnings loaded
   * @type {bool}
   */
  isWarningsLoaded: false,

  /**
   * Check are hosts have any warnings
   * @type {bool}
   */
  isHostHaveWarnings: function () {
    return this.get('warnings.length') > 0;
  }.property('warnings'),

  /**
   * Should warnings-box be visible
   * @type {bool}
   */
  isWarningsBoxVisible: function () {
    return (App.testMode) ? true : !this.get('isRegistrationInProgress');
  }.property('isRegistrationInProgress'),

  /**
   * Progress value for "update hosts status" process
   * @type {number}
   */
  checksUpdateProgress: 0,

  /**
   *
   * @type {object}
   */
  checksUpdateStatus: null,

  /**
   *
   * @method navigateStep
   */
  navigateStep: function () {
    if (this.get('isLoaded')) {
      if (!this.get('content.installOptions.manualInstall')) {
        if (!this.get('wizardController').getDBProperty('bootStatus')) {
          this.startBootstrap();
        }
      } else {
        this.set('bootHosts', this.get('hosts'));
        if (App.testMode) {
          this.getHostInfo();
          this.get('bootHosts').setEach('cpu', '2');
          this.get('bootHosts').setEach('memory', '2000000');
          this.set('isSubmitDisabled', false);
        } else {
          this.set('registrationStartedAt', null);
          this.startRegistration();
        }
      }
    }
  }.observes('isLoaded'),

  /**
   * Clear controller data
   * @method clearStep
   */
  clearStep: function () {
    this.set('stopBootstrap', false);
    this.set('hosts', []);
    this.get('bootHosts').clear();
    this.get('wizardController').setDBProperty('bootStatus', false);
    this.set('isSubmitDisabled', true);
    this.set('isRetryDisabled', true);
  },

  /**
   * Make basic init steps
   * @method loadStep
   */
  loadStep: function () {
    console.log("TRACE: Loading step3: Confirm Hosts");
    this.set('registrationStartedAt', null);
    this.set('isLoaded', false);
    this.disablePreviousSteps();
    this.clearStep();
    this.loadHosts();
  },

  /**
   * Loads the hostinfo from localStorage on the insertion of view. It's being called from view
   * @method loadHosts
   */
  loadHosts: function () {
    var hostsInfo = this.get('content.hosts');
    var hosts = [];
    var bootStatus = (this.get('content.installOptions.manualInstall')) ? 'DONE' : 'PENDING';
    if (App.testMode) {
      bootStatus = 'REGISTERED';
    }

    for (var index in hostsInfo) {
      if (hostsInfo.hasOwnProperty(index)) {
        hosts.pushObject(App.HostInfo.create({
          name: hostsInfo[index].name,
          bootStatus: bootStatus,
          isChecked: false
        }));
      }
    }
    this.set('hosts', hosts);
    this.set('isLoaded', true);
  },

  /**
   * Parses and updates the content based on bootstrap API response.
   * @return {bool} true if polling should continue (some hosts are in "RUNNING" state); false otherwise
   * @method parseHostInfo
   */
  parseHostInfo: function (hostsStatusFromServer) {
    hostsStatusFromServer.forEach(function (_hostStatus) {
      var host = this.get('bootHosts').findProperty('name', _hostStatus.hostName);
      // check if hostname extracted from REST API data matches any hostname in content
      // also, make sure that bootStatus modified by isHostsRegistered call does not get overwritten
      // since these calls are being made in parallel
      if (host && !['REGISTERED', 'REGISTERING'].contains(host.get('bootStatus'))) {
        host.set('bootStatus', _hostStatus.status);
        host.set('bootLog', _hostStatus.log);
      }
    }, this);
    // if the data rendered by REST API has hosts in "RUNNING" state, polling will continue
    return this.get('bootHosts').length != 0 && this.get('bootHosts').someProperty('bootStatus', 'RUNNING');
  },

  /**
   * Remove list of hosts
   * @param {Ember.Enumerable} hosts
   * @return {App.ModalPopup}
   * @method removeHosts
   */
  removeHosts: function (hosts) {
    var self = this;
    return App.showConfirmationPopup(function () {
      App.router.send('removeHosts', hosts);
      self.hosts.removeObjects(hosts);
      if (!self.hosts.length) {
        self.set('isSubmitDisabled', true);
      }
    }, Em.I18n.t('installer.step3.hosts.remove.popup.body'));
  },

  /**
   * Removes a single element on the trash icon click. Called from View
   * @param {object} hostInfo
   * @method removeHost
   */
  removeHost: function (hostInfo) {
    this.removeHosts([hostInfo]);
  },

  /**
   * Remove selected hosts (click-handler)
   * @return App.ModalPopup
   * @method removeSelectedHosts
   */
  removeSelectedHosts: function () {
    var selectedHosts = this.get('hosts').filterProperty('isChecked', true);
    selectedHosts.forEach(function (_hostInfo) {
      console.log('Removing:  ' + _hostInfo.name);
    });
    return this.removeHosts(selectedHosts);
  },

  /**
   * Show popup with the list of hosts which are selected
   * @return App.ModalPopup
   * @method selectedHostsPopup
   */
  selectedHostsPopup: function () {
    var selectedHosts = this.get('hosts').filterProperty('isChecked').mapProperty('name');
    return App.ModalPopup.show({
      header: Em.I18n.t('installer.step3.selectedHosts.popup.header'),
      secondary: null,
      bodyClass: Em.View.extend({
        templateName: require('templates/common/items_list_popup'),
        items: selectedHosts,
        insertedItems: [],
        didInsertElement: function () {
          lazyloading.run({
            destination: this.get('insertedItems'),
            source: this.get('items'),
            context: this,
            initSize: 100,
            chunkSize: 500,
            delay: 100
          });
        }
      })
    });
  },

  /**
   * Retry one host {click-handler}
   * @param {object} hostInfo
   * @method retryHost
   */
  retryHost: function (hostInfo) {
    this.retryHosts([hostInfo]);
  },

  /**
   * Retry list of hosts
   * @param {object[]} hosts
   * @method retryHosts
   */
  retryHosts: function (hosts) {
    var bootStrapData = JSON.stringify({
      'verbose': true,
      'sshKey': this.get('content.installOptions.sshKey'),
      'hosts': hosts.mapProperty('name'),
      'user': this.get('content.installOptions.sshUser')}
    );
    this.set('numPolls', 0);
    this.set('registrationStartedAt', null);
    if (this.get('content.installOptions.manualInstall')) {
      this.get('bootHosts').setEach('bootStatus', 'DONE');
      this.startRegistration();
    }
    else {
      var requestId = App.router.get('installerController').launchBootstrap(bootStrapData);
      this.set('content.installOptions.bootRequestId', requestId);
      this.doBootstrap();
    }
  },

  /**
   * Retry selected hosts (click-handler)
   * @method retrySelectedHosts
   */
  retrySelectedHosts: function () {
    if (!this.get('isRetryDisabled')) {
      this.set('isRetryDisabled', true);
      var selectedHosts = this.get('bootHosts').filterProperty('bootStatus', 'FAILED');
      selectedHosts.forEach(function (_host) {
        _host.set('bootStatus', 'RUNNING');
        _host.set('bootLog', 'Retrying ...');
      }, this);
      this.retryHosts(selectedHosts);
    }
  },

  /**
   * Init bootstrap settings and start it
   * @method startBootstrap
   */
  startBootstrap: function () {
    //this.set('isSubmitDisabled', true);    //TODO: uncomment after actual hookup
    this.set('numPolls', 0);
    this.set('registrationStartedAt', null);
    this.set('bootHosts', this.get('hosts'));
    this.doBootstrap();
  },

  /**
   * Update <code>isRegistrationInProgress</code> once
   * @method setRegistrationInProgressOnce
   */
  setRegistrationInProgressOnce: function () {
    Em.run.once(this, 'setRegistrationInProgress');
  }.observes('bootHosts.@each.bootStatus'),

  /**
   * Set <code>isRegistrationInProgress</code> value based on each host boot status
   * @method setRegistrationInProgress
   */
  setRegistrationInProgress: function () {
    var bootHosts = this.get('bootHosts');
    //if hosts aren't loaded yet then registration should be in progress
    var result = (bootHosts.length === 0 && !this.get('isLoaded'));
    for (var i = 0, l = bootHosts.length; i < l; i++) {
      if (bootHosts[i].get('bootStatus') !== 'REGISTERED' && bootHosts[i].get('bootStatus') !== 'FAILED') {
        result = true;
        break;
      }
    }
    this.set('isRegistrationInProgress', result);
  },

  /**
   * Disable wizard's previous steps (while registering)
   * @method disablePreviousSteps
   */
  disablePreviousSteps: function () {
    App.router.get('installerController.isStepDisabled').filter(function (step) {
      return step.step >= 0 && step.step <= 2;
    }).setEach('value', this.get('isRegistrationInProgress'));
    if (this.get('isRegistrationInProgress')) {
      this.set('isSubmitDisabled', true);
    }
  }.observes('isRegistrationInProgress'),

  /**
   * Do bootstrap calls
   * @method doBootstrap
   */
  doBootstrap: function () {
    if (this.get('stopBootstrap')) {
      return;
    }
    this.incrementProperty('numPolls');

    App.ajax.send({
      name: 'wizard.step3.bootstrap',
      sender: this,
      data: {
        bootRequestId: this.get('content.installOptions.bootRequestId'),
        numPolls: this.get('numPolls')
      },
      success: 'doBootstrapSuccessCallback'
    }).
      retry({
        times: App.maxRetries,
        timeout: App.timeout
      }).
      then(
      null,
      function () {
        App.showReloadPopup();
        console.log('Bootstrap failed');
      }
    );
  },

  /**
   * Success-callback for each boostrap request
   * @param {object} data
   * @method doBootstrapSuccessCallback
   */
  doBootstrapSuccessCallback: function (data) {
    var self = this;
    var pollingInterval = 3000;
    if (Em.isNone(data.hostsStatus)) {
      console.log('Invalid response, setting timeout');
      window.setTimeout(function () {
        self.doBootstrap()
      }, pollingInterval);
    } else {
      // in case of bootstrapping just one host, the server returns an object rather than an array, so
      // force into an array
      if (!(data.hostsStatus instanceof Array)) {
        data.hostsStatus = [ data.hostsStatus ];
      }
      console.log("TRACE: In success function for the GET bootstrap call");
      var keepPolling = this.parseHostInfo(data.hostsStatus);

      // Single host : if the only hostname is invalid (data.status == 'ERROR')
      // Multiple hosts : if one or more hostnames are invalid
      // following check will mark the bootStatus as 'FAILED' for the invalid hostname
      if (data.status == 'ERROR' || data.hostsStatus.length != this.get('bootHosts').length) {

        var hosts = this.get('bootHosts');

        for (var i = 0; i < hosts.length; i++) {

          var isValidHost = data.hostsStatus.someProperty('hostName', hosts[i].get('name'));
          if (hosts[i].get('bootStatus') !== 'REGISTERED') {
            if (!isValidHost) {
              hosts[i].set('bootStatus', 'FAILED');
              hosts[i].set('bootLog', Em.I18n.t('installer.step3.hosts.bootLog.failed'));
            }
          }
        }
      }

      if (data.status == 'ERROR' || data.hostsStatus.someProperty('status', 'DONE') || data.hostsStatus.someProperty('status', 'FAILED')) {
        // kicking off registration polls after at least one host has succeeded
        this.startRegistration();
      }
      if (keepPolling) {
        window.setTimeout(function () {
          self.doBootstrap()
        }, pollingInterval);
      }
    }
  },

  /**
   * Start hosts registration
   * @method startRegistration
   */
  startRegistration: function () {
    if (Em.isNone(this.get('registrationStartedAt'))) {
      this.set('registrationStartedAt', App.dateTime());
      console.log('registration started at ' + this.get('registrationStartedAt'));
      this.isHostsRegistered();
    }
  },

  /**
   * Do requests to check if hosts are already registered
   * @method isHostsRegistered
   */
  isHostsRegistered: function () {
    if (this.get('stopBootstrap')) {
      return;
    }
    App.ajax.send({
      name: 'wizard.step3.is_hosts_registered',
      sender: this,
      success: 'isHostsRegisteredSuccessCallback'
    }).
      retry({
        times: App.maxRetries,
        timeout: App.timeout
      }).
      then(
      null,
      function () {
        App.showReloadPopup();
        console.log('Error: Getting registered host information from the server');
      }
    );
  },

  /**
   * Success-callback for registered hosts request
   * @param {object} data
   * @method isHostsRegisteredSuccessCallback
   */
  isHostsRegisteredSuccessCallback: function (data) {
    console.log('registration attempt...');
    var hosts = this.get('bootHosts');
    var jsonData = data;
    if (!jsonData) {
      console.warn("Error: jsonData is null");
      return;
    }

    // keep polling until all hosts have registered/failed, or registrationTimeout seconds after the last host finished bootstrapping
    var stopPolling = true;
    hosts.forEach(function (_host, index) {
      // Change name of first host for test mode.
      if (App.testMode) {
        if (index == 0) {
          _host.set('name', 'localhost.localdomain');
        }
      }
      // actions to take depending on the host's current bootStatus
      // RUNNING - bootstrap is running; leave it alone
      // DONE - bootstrap is done; transition to REGISTERING
      // REGISTERING - bootstrap is done but has not registered; transition to REGISTERED if host found in polling API result
      // REGISTERED - bootstrap and registration is done; leave it alone
      // FAILED - either bootstrap or registration failed; leave it alone
      switch (_host.get('bootStatus')) {
        case 'DONE':
          _host.set('bootStatus', 'REGISTERING');
          _host.set('bootLog', (_host.get('bootLog') != null ? _host.get('bootLog') : '') + Em.I18n.t('installer.step3.hosts.bootLog.registering'));
          // update registration timestamp so that the timeout is computed from the last host that finished bootstrapping
          this.set('registrationStartedAt', App.dateTime());
          stopPolling = false;
          break;
        case 'REGISTERING':
          if (jsonData.items.someProperty('Hosts.host_name', _host.name)) {
            _host.set('bootStatus', 'REGISTERED');
            _host.set('bootLog', (_host.get('bootLog') != null ? _host.get('bootLog') : '') + Em.I18n.t('installer.step3.hosts.bootLog.registering'));
          } else {
            stopPolling = false;
          }
          break;
        case 'RUNNING':
          stopPolling = false;
          break;
        case 'REGISTERED':
        case 'FAILED':
        default:
          break;
      }
    }, this);

    if (stopPolling) {
      this.getHostInfo();
    }
    else {
      if (hosts.someProperty('bootStatus', 'RUNNING') || App.dateTime() - this.get('registrationStartedAt') < this.get('registrationTimeoutSecs') * 1000) {
        // we want to keep polling for registration status if any of the hosts are still bootstrapping (so we check for RUNNING).
        var self = this;
        window.setTimeout(function () {
          self.isHostsRegistered();
        }, 3000);
      }
      else {
        // registration timed out.  mark all REGISTERING hosts to FAILED
        console.log('registration timed out');
        hosts.filterProperty('bootStatus', 'REGISTERING').forEach(function (_host) {
          _host.set('bootStatus', 'FAILED');
          _host.set('bootLog', (_host.get('bootLog') != null ? _host.get('bootLog') : '') + Em.I18n.t('installer.step3.hosts.bootLog.failed'));
        });
        this.getHostInfo();
      }
    }
  },

  /**
   * Do request for all registered hosts
   * @return {$.ajax}
   * @method getAllRegisteredHosts
   */
  getAllRegisteredHosts: function () {
    return App.ajax.send({
      name: 'wizard.step3.is_hosts_registered',
      sender: this,
      success: 'getAllRegisteredHostsCallback'
    });
  }.observes('bootHosts'),

  /**
   * Success-callback for all registered hosts request
   * @param {object} hosts
   * @method getAllRegisteredHostsCallback
   */
  getAllRegisteredHostsCallback: function (hosts) {
    var registeredHosts = [];
    var hostsInCluster = this.get('hostsInCluster');
    var addedHosts = this.get('bootHosts').getEach('name');
    hosts.items.forEach(function (host) {
      if (!hostsInCluster.contains(host.Hosts.host_name) && !addedHosts.contains(host.Hosts.host_name)) {
        registeredHosts.push(host.Hosts.host_name);
      }
    });
    if (registeredHosts.length) {
      this.set('hasMoreRegisteredHosts', true);
      this.set('registeredHosts', registeredHosts);
    } else {
      this.set('hasMoreRegisteredHosts', false);
      this.set('registeredHosts', '');
    }
  },

  /**
   * Show popup with regitration error-message
   * @param {string} header
   * @param {string} message
   * @return {App.ModalPopup}
   * @method registerErrPopup
   */
  registerErrPopup: function (header, message) {
    return App.ModalPopup.show({
      header: header,
      secondary: false,
      bodyClass: Em.View.extend({
        template: Em.Handlebars.compile('<p>{{view.message}}</p>'),
        message: message
      })
    });
  },

  /**
   * Get disk info and cpu count of booted hosts from server
   * @return {$.ajax}
   * @method getHostInfo
   */
  getHostInfo: function () {
    this.set('isWarningsLoaded', false);
    return App.ajax.send({
      name: 'wizard.step3.host_info',
      sender: this,
      success: 'getHostInfoSuccessCallback',
      error: 'getHostInfoErrorCallback'
    });
  },

  /**
   * Success-callback for hosts info request
   * @param {object} jsonData
   * @method getHostInfoSuccessCallback
   */
  getHostInfoSuccessCallback: function (jsonData) {
    var hosts = this.get('bootHosts');
    var self = this;
    this.parseWarnings(jsonData);
    var repoWarnings = [];
    var hostsContext = [];
    var diskWarnings = [];
    var hostsDiskContext = [];
    var hostsDiskNames = [];
    var hostsRepoNames = [];
    hosts.forEach(function (_host) {
      var host = (App.testMode) ? jsonData.items[0] : jsonData.items.findProperty('Hosts.host_name', _host.name);
      if (App.skipBootstrap) {
        _host.set('cpu', 2);
        _host.set('memory', ((parseInt(2000000))).toFixed(2));
        _host.set('disk_info', [
          {"mountpoint": "/", "type": "ext4"},
          {"mountpoint": "/grid/0", "type": "ext4"},
          {"mountpoint": "/grid/1", "type": "ext4"},
          {"mountpoint": "/grid/2", "type": "ext4"}
        ]);
      } else if (host) {
        _host.set('cpu', host.Hosts.cpu_count);
        _host.set('memory', ((parseInt(host.Hosts.total_mem))).toFixed(2));
        _host.set('disk_info', host.Hosts.disk_info.filter(function(host){ return host.mountpoint!="/boot"}));
        _host.set('os_type', host.Hosts.os_type);
        _host.set('os_arch', host.Hosts.os_arch);
        _host.set('ip', host.Hosts.ip);

        var context = self.checkHostOSType(host.Hosts.os_type, host.Hosts.host_name);
        if (context) {
          hostsContext.push(context);
          hostsRepoNames.push(host.Hosts.host_name);
        }
        var diskContext = self.checkHostDiskSpace(host.Hosts.host_name, host.Hosts.disk_info);
        if (diskContext) {
          hostsDiskContext.push(diskContext);
          hostsDiskNames.push(host.Hosts.host_name);
        }

      }
    });
    if (hostsContext.length > 0) { // warning exist
      var repoWarning = {
        name: Em.I18n.t('installer.step3.hostWarningsPopup.repositories.name'),
        hosts: hostsContext,
        hostsNames: hostsRepoNames,
        category: 'repositories',
        onSingleHost: false
      };
      repoWarnings.push(repoWarning);
    }
    if (hostsDiskContext.length > 0) { // disk space warning exist
      var diskWarning = {
        name: Em.I18n.t('installer.step3.hostWarningsPopup.disk.name'),
        hosts: hostsDiskContext,
        hostsNames: hostsDiskNames,
        category: 'disk',
        onSingleHost: false
      };
      diskWarnings.push(diskWarning);
    }

    this.set('repoCategoryWarnings', repoWarnings);
    this.set('diskCategoryWarnings', diskWarnings);
    this.stopRegistration();
  },

  /**
   * Error-callback for hosts info request
   * @method getHostInfoErrorCallback
   */
  getHostInfoErrorCallback: function () {
    console.log('INFO: Getting host information(cpu_count and total_mem) from the server failed');
    this.set('isWarningsLoaded', true);
    this.registerErrPopup(Em.I18n.t('installer.step3.hostInformation.popup.header'), Em.I18n.t('installer.step3.hostInformation.popup.body'));
  },

  /**
   * Enable or disable submit/retry buttons according to hosts boot statuses
   * @method stopRegistration
   */
  stopRegistration: function () {
    this.set('isSubmitDisabled', !this.get('bootHosts').someProperty('bootStatus', 'REGISTERED'));
    this.set('isRetryDisabled', !this.get('bootHosts').someProperty('bootStatus', 'FAILED'));
  },

  /**
   * Check if the customized os group contains the registered host os type. If not the repo on that host is invalid.
   * @param {string} osType
   * @param {string} hostName
   * @return {string} error-message or empty string
   * @method checkHostOSType
   */
  checkHostOSType: function (osType, hostName) {
    if (this.get('content.stacks')) {
      var selectedStack = this.get('content.stacks').findProperty('isSelected', true);
      var selectedOS = [];
      var isValid = false;
      if (selectedStack && selectedStack.operatingSystems) {
        selectedStack.get('operatingSystems').filterProperty('selected', true).forEach(function (os) {
          selectedOS.pushObject(os.osType);
          if (os.osType == osType) {
            isValid = true;
          }
        });
      }

      if (!isValid) {
        console.log('WARNING: Getting host os type does NOT match the user selected os group in step1. ' +
          'Host Name: ' + hostName + '. Host os type:' + osType + '. Selected group:' + selectedOS);
        return Em.I18n.t('installer.step3.hostWarningsPopup.repositories.context').format(hostName, osType, selectedOS);
      } else {
        return '';
      }
    } else {
      return '';
    }
  },

  /**
   * Check if current host has enough free disk usage.
   * @param {string} hostName
   * @param {object} diskInfo
   * @return {string} error-message or empty string
   * @method checkHostDiskSpace
   */
  checkHostDiskSpace: function (hostName, diskInfo) {
    var minFreeRootSpace = App.minDiskSpace * 1024 * 1024; //in kilobyte
    var minFreeUsrLibSpace = App.minDiskSpaceUsrLib * 1024 * 1024; //in kilobyte
    var warningString = '';

    diskInfo.forEach(function (info) {
      switch (info.mountpoint) {
        case '/':
          warningString = info.available < minFreeRootSpace ?
            Em.I18n.t('installer.step3.hostWarningsPopup.disk.context2').format(App.minDiskSpace + 'GB', info.mountpoint) + ' ' + warningString :
            warningString;
          break;
        case '/usr':
        case '/usr/lib':
          warningString = info.available < minFreeUsrLibSpace ?
            Em.I18n.t('installer.step3.hostWarningsPopup.disk.context2').format(App.minDiskSpaceUsrLib + 'GB', info.mountpoint) + ' ' + warningString :
            warningString;
          break;
        default:
          break;
      }
    });
    if (warningString) {
      console.log('WARNING: Getting host free disk space. ' + 'Host Name: ' + hostName);
      return Em.I18n.t('installer.step3.hostWarningsPopup.disk.context1').format(hostName) + ' ' + warningString;
    } else {
      return '';
    }
  },

  /**
   * Submit-click handler
   * @return {App.ModalPopup|null}
   * @method submit
   */
  submit: function () {
    if (this.get('isHostHaveWarnings')) {
      var self = this;
      return App.showConfirmationPopup(
        function () {
          self.set('content.hosts', self.get('bootHosts'));
          App.router.send('next');
        },
        Em.I18n.t('installer.step3.hostWarningsPopup.hostHasWarnings'));
    }
    else {
      this.set('content.hosts', this.get('bootHosts'));
      App.router.send('next');
    }
    return null;
  },

  /**
   * Show popup with host log
   * @param {object} event
   * @return {App.ModalPopup}
   */
  hostLogPopup: function (event) {
    var host = event.context;

    return App.ModalPopup.show({
      header: Em.I18n.t('installer.step3.hostLog.popup.header').format(host.get('name')),
      secondary: null,
      host: host,
      bodyClass: App.WizardStep3HostLogPopupBody
    });
  },

  /**
   * Check warnings from server and put it in parsing
   * @method rerunChecks
   */
  rerunChecks: function () {
    var self = this;
    var currentProgress = 0;
    var interval = setInterval(function () {
      currentProgress += 100000 / self.get('warningsTimeInterval');
      if (currentProgress < 100) {
        self.set('checksUpdateProgress', currentProgress);
      } else {
        clearInterval(interval);
        App.ajax.send({
          name: 'wizard.step3.rerun_checks',
          sender: self,
          success: 'rerunChecksSuccessCallback',
          error: 'rerunChecksErrorCallback'
        });
      }
    }, 1000);
  },

  /**
   * Success-callback for rerun request
   * @param {object} data
   * @method rerunChecksSuccessCallback
   */
  rerunChecksSuccessCallback: function (data) {
    this.set('checksUpdateProgress', 100);
    this.set('checksUpdateStatus', 'SUCCESS');
    this.parseWarnings(data);
  },

  /**
   * Error-callback for rerun request
   * @method rerunChecksErrorCallback
   */
  rerunChecksErrorCallback: function () {
    this.set('checksUpdateProgress', 100);
    this.set('checksUpdateStatus', 'FAILED');
    console.log('INFO: Getting host information(last_agent_env) from the server failed');
  },

  /**
   * Filter data for warnings parse
   * is data from host in bootStrap
   * @param {object} data
   * @return {Object}
   * @method filterBootHosts
   */
  filterBootHosts: function (data) {
    var bootHostNames = {};
    this.get('bootHosts').forEach(function (bootHost) {
      bootHostNames[bootHost.get('name')] = true;
    });
    var filteredData = {
      href: data.href,
      items: []
    };
    data.items.forEach(function (host) {
      if (bootHostNames[host.Hosts.host_name]) {
        filteredData.items.push(host);
      }
    });
    return filteredData;
  },

  /**
   * Parse warnings data for each host and total
   * @param {object} data
   * @method parseWarnings
   */
  parseWarnings: function (data) {
    data = App.testMode ? data : this.filterBootHosts(data);
    var warnings = [];
    var warning;
    var hosts = [];
    var warningCategories = {
      fileFoldersWarnings: {},
      packagesWarnings: {},
      processesWarnings: {},
      servicesWarnings: {},
      usersWarnings: {},
      alternativeWarnings: {}
    };

    data.items.sortPropertyLight('Hosts.host_name').forEach(function (_host) {
      var host = {
        name: _host.Hosts.host_name,
        warnings: []
      };
      if (!_host.Hosts.last_agent_env) {
        // in some unusual circumstances when last_agent_env is not available from the _host,
        // skip the _host and proceed to process the rest of the hosts.
        console.log("last_agent_env is missing for " + _host.Hosts.host_name + ".  Skipping _host check.");
        return;
      }

      //parse all directories and files warnings for host

      //todo: to be removed after check in new API
      var stackFoldersAndFiles = _host.Hosts.last_agent_env.stackFoldersAndFiles || [];
      stackFoldersAndFiles.forEach(function (path) {
        warning = warningCategories.fileFoldersWarnings[path.name];
        if (warning) {
          warning.hosts.push(_host.Hosts.host_name);
          warning.onSingleHost = false;
        } else {
          warningCategories.fileFoldersWarnings[path.name] = warning = {
            name: path.name,
            hosts: [_host.Hosts.host_name],
            category: 'fileFolders',
            onSingleHost: true
          };
        }
        host.warnings.push(warning);
      }, this);

      //parse all package warnings for host
      if (_host.Hosts.last_agent_env.installedPackages) {
        _host.Hosts.last_agent_env.installedPackages.forEach(function (_package) {
          warning = warningCategories.packagesWarnings[_package.name];
          if (warning) {
            warning.hosts.push(_host.Hosts.host_name);
            warning.version = _package.version;
            warning.onSingleHost = false;
          } else {
            warningCategories.packagesWarnings[_package.name] = warning = {
              name: _package.name,
              version: _package.version,
              hosts: [_host.Hosts.host_name],
              category: 'packages',
              onSingleHost: true
            };
          }
          host.warnings.push(warning);
        }, this);
      }

      //parse all process warnings for host

      //todo: to be removed after check in new API
      var javaProcs = _host.Hosts.last_agent_env.hostHealth ? _host.Hosts.last_agent_env.hostHealth.activeJavaProcs : _host.Hosts.last_agent_env.javaProcs;
      if (javaProcs) {
      javaProcs.forEach(function (process) {
        warning = warningCategories.processesWarnings[process.pid];
        if (warning) {
          warning.hosts.push(_host.Hosts.host_name);
          warning.onSingleHost = false;
        } else {
          warningCategories.processesWarnings[process.pid] = warning = {
            name: (process.command.substr(0, 35) + '...'),
            hosts: [_host.Hosts.host_name],
            category: 'processes',
            user: process.user,
            pid: process.pid,
            command: '<table><tr><td style="word-break: break-all;">' +
              ((process.command.length < 500) ? process.command : process.command.substr(0, 230) + '...' +
                '<p style="text-align: center">................</p>' +
                '...' + process.command.substr(-230)) + '</td></tr></table>',
            onSingleHost: true
          };
        }
        host.warnings.push(warning);
      }, this);
    }

      //parse all service warnings for host

      //todo: to be removed after check in new API
      if (_host.Hosts.last_agent_env.hostHealth && _host.Hosts.last_agent_env.hostHealth.liveServices) {
        _host.Hosts.last_agent_env.hostHealth.liveServices.forEach(function (service) {
          if (service.status === 'Unhealthy') {
            warning = warningCategories.servicesWarnings[service.name];
            if (warning) {
              warning.hosts.push(_host.Hosts.host_name);
              warning.onSingleHost = false;
            } else {
              warningCategories.servicesWarnings[service.name] = warning = {
                name: service.name,
                hosts: [_host.Hosts.host_name],
                category: 'services',
                onSingleHost: true
              };
            }
            host.warnings.push(warning);
          }
        }, this);
      }
      //parse all user warnings for host

      //todo: to be removed after check in new API
      if (_host.Hosts.last_agent_env.existingUsers) {
        _host.Hosts.last_agent_env.existingUsers.forEach(function (user) {
          warning = warningCategories.usersWarnings[user.userName];
          if (warning) {
            warning.hosts.push(_host.Hosts.host_name);
            warning.onSingleHost = false;
          } else {
            warningCategories.usersWarnings[user.userName] = warning = {
              name: user.userName,
              hosts: [_host.Hosts.host_name],
              category: 'users',
              onSingleHost: true
            };
          }
          host.warnings.push(warning);
        }, this);
      }

      //parse misc warnings for host
      var umask = _host.Hosts.last_agent_env.umask;
      if (umask && umask !== 18) {
        warning = warnings.filterProperty('category', 'misc').findProperty('name', umask);
        if (warning) {
          warning.hosts.push(_host.Hosts.host_name);
          warning.onSingleHost = false;
        } else {
          warning = {
            name: umask,
            hosts: [_host.Hosts.host_name],
            category: 'misc',
            onSingleHost: true
          };
          warnings.push(warning);
        }
        host.warnings.push(warning);
      }

      var firewallRunning = _host.Hosts.last_agent_env.iptablesIsRunning;
      if (firewallRunning !== null && firewallRunning) {
        var name = Em.I18n.t('installer.step3.hostWarningsPopup.firewall.name');
        warning = warnings.filterProperty('category', 'firewall').findProperty('name', name);
        if (warning) {
          warning.hosts.push(_host.Hosts.host_name);
          warning.onSingleHost = false;
        } else {
          warning = {
            name: name,
            hosts: [_host.Hosts.host_name],
            category: 'firewall',
            onSingleHost: true
          };
          warnings.push(warning);
        }
        host.warnings.push(warning);
      }

      if (_host.Hosts.last_agent_env.alternatives) {
        _host.Hosts.last_agent_env.alternatives.forEach(function (alternative) {
          warning = warningCategories.alternativeWarnings[alternative.name];
          if (warning) {
            warning.hosts.push(_host.Hosts.host_name);
            warning.onSingleHost = false;
          } else {
            warningCategories.alternativeWarnings[alternative.name] = warning = {
              name: alternative.name,
              target: alternative.target,
              hosts: [_host.Hosts.host_name],
              category: 'alternatives',
              onSingleHost: true
            };
          }
          host.warnings.push(warning);
        }, this);
      }

      hosts.push(host);
    }, this);

    for (var categoryId in warningCategories) {
      var category = warningCategories[categoryId]
      for (var warningId in category) {
        warnings.push(category[warningId]);
      }
    }

    warnings.forEach(function (warn) {
      if (warn.hosts.length < 11) {
        warn.hostsList = warn.hosts.join('<br>')
      } else {
        warn.hostsList = warn.hosts.slice(0, 10).join('<br>') + '<br> ' + Em.I18n.t('installer.step3.hostWarningsPopup.moreHosts').format(warn.hosts.length - 10);
      }
    });
    hosts.unshift({
      name: 'All Hosts',
      warnings: warnings
    });
    this.set('warnings', warnings);
    this.set('warningsByHost', hosts);
    this.set('isWarningsLoaded', true);
  },

  /**
   * Open popup that contain hosts' warnings
   * @return {App.ModalPopup}
   * @method hostWarningsPopup
   */
  hostWarningsPopup: function () {
    var self = this;
    return App.ModalPopup.show({

      header: Em.I18n.t('installer.step3.warnings.popup.header'),

      secondary: Em.I18n.t('installer.step3.hostWarningsPopup.rerunChecks'),

      primary: Em.I18n.t('common.close'),

      onPrimary: function () {
        self.set('checksUpdateStatus', null);
        this.hide();
      },

      onClose: function () {
        self.set('checksUpdateStatus', null);
        this.hide();
      },

      onSecondary: function () {
        self.rerunChecks();
      },

      didInsertElement: function () {
        this.fitHeight();
      },

      footerClass: App.WizardStep3HostWarningPopupFooter,

      bodyClass: App.WizardStep3HostWarningPopupBody
    });
  },

  /**
   * Show popup with registered hosts
   * @return {App.ModalPopup}
   * @method registeredHostsPopup
   */
  registeredHostsPopup: function () {
    var self = this;
    return App.ModalPopup.show({
      header: Em.I18n.t('installer.step3.warning.registeredHosts').format(this.get('registeredHosts').length),
      secondary: null,
      bodyClass: Em.View.extend({
        templateName: require('templates/wizard/step3/step3_registered_hosts_popup'),
        message: Em.I18n.t('installer.step3.registeredHostsPopup'),
        registeredHosts: self.get('registeredHosts')
      })
    })
  }

});
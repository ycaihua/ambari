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

package org.apache.ambari.server.orm.entities;

import javax.persistence.Basic;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

/**
 * Represents a blueprint configuration.
 */
@javax.persistence.IdClass(BlueprintConfigEntityPK.class)
@Table(name = "blueprint_configuration")
@Entity
public class BlueprintConfigEntity implements BlueprintConfiguration {

  @Id
  @Column(name = "blueprint_name", nullable = false, insertable = false, updatable = false)
  private String blueprintName;

  @Id
  @Column(name = "type_name", nullable = false, insertable = true, updatable = false)
  private String type;

  @Column(name = "config_data", nullable = false, insertable = true, updatable = false)
  @Basic
  private String configData;

  @ManyToOne
  @JoinColumn(name = "blueprint_name", referencedColumnName = "blueprint_name", nullable = false)
  private BlueprintEntity blueprint;


  /**
   * Get the configuration type.
   *
   * @return configuration type
   */
  public String getType() {
    return type;
  }

  /**
   * Set the configuration type.
   *
   * @param type  configuration type
   */
  public void setType(String type) {
    this.type = type;
  }

  /**
   * Get the blueprint entity instance.
   *
   * @return blueprint entity
   */
  public BlueprintEntity getBlueprintEntity() {
    return blueprint;
  }

  /**
   * Set the blueprint entity instance.
   *
   * @param entity  blueprint entity
   */
  public void setBlueprintEntity(BlueprintEntity entity) {
    this.blueprint = entity;
  }

  /**
   * Get the name of the associated blueprint.
   *
   * @return blueprint name
   */
  public String getBlueprintName() {
    return blueprintName;
  }

  /**
   * Set the name of the associated blueprint.
   * '
   * @param blueprintName  blueprint name
   */
  public void setBlueprintName(String blueprintName) {
    this.blueprintName = blueprintName;
  }

  /**
   * Get the config data.
   *
   * @return config data in json format
   */
  public String getConfigData() {
    return configData;
  }

  /**
   * Set the config data.
   *
   * @param configData  all config data in json format
   */
  public void setConfigData(String configData) {
    this.configData = configData;
  }
}
